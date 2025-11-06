const { query } = require('../config/db');
const { generateAISummary } = require('../utils/ai');
const {
	fetchPubMedPublications,
	fetchClinicalTrialsGov,
	fetchGoogleScholarPublications,
	fetchResearchGatePublicationsByQuery,
} = require('../utils/externalApis');

/**
 * Ensure publications and clinical trials tables have baseline data.
 * If a table is empty, seed it using external APIs with provided conditions.
 * This function is idempotent for the session: it only runs inserts if counts are zero,
 * and also performs basic de-duplication on insert.
 *
 * @param {string[]} conditions
 */
const ensureSeededForConditions = async (conditions = []) => {
	try {
		// Normalize conditions and provide defaults if empty
		const normalizedConditions = Array.isArray(conditions) && conditions.length > 0
			? conditions
			: ['cancer', 'diabetes', 'cardiovascular', 'neurology'];

		// Check current counts
		const pubsCountRes = await query('SELECT COUNT(*)::int AS count FROM publications');
		const trialsCountRes = await query('SELECT COUNT(*)::int AS count FROM clinical_trials');
		const publicationsCount = pubsCountRes.rows[0]?.count || 0;
		const trialsCount = trialsCountRes.rows[0]?.count || 0;

		// Seed Publications if empty
		if (publicationsCount === 0) {
			let importedPublications = [];

			// Limit to first few conditions to avoid excessive calls
			const seedConditions = normalizedConditions.slice(0, 3);

			for (const cond of seedConditions) {
				// PubMed
				const pubmed = await fetchPubMedPublications(cond, 10);
				importedPublications = importedPublications.concat(pubmed);

				// Google Scholar (placeholder - likely empty)
				const scholar = await fetchGoogleScholarPublications(cond, 10);
				importedPublications = importedPublications.concat(scholar);

				// ResearchGate (placeholder - likely empty)
				const rg = await fetchResearchGatePublicationsByQuery(cond, 10);
				importedPublications = importedPublications.concat(rg);
			}

			for (const pub of importedPublications) {
				try {
					const doi = (pub.doi || '').trim();
					let exists = false;
					if (doi) {
						const existingByDoi = await query('SELECT id FROM publications WHERE doi = $1', [doi]);
						exists = existingByDoi.rows.length > 0;
					}
					if (!exists) {
						// As a fallback dedupe by title lowercased
						const title = (pub.title || '').trim();
						if (title) {
							const existingByTitle = await query(
								'SELECT id FROM publications WHERE LOWER(title) = LOWER($1) LIMIT 1',
								[title]
							);
							exists = existingByTitle.rows.length > 0;
						}
					}
					if (exists) continue;

					let aiSummary = null;
					try {
						aiSummary = await generateAISummary(pub.abstract || pub.title || '');
					} catch (_) {
						aiSummary = null;
					}

					await query(
						`INSERT INTO publications 
						 (title, authors, journal, publication_date, doi, abstract, full_text_url, ai_summary, source)
						 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
						[
							pub.title || '',
							Array.isArray(pub.authors) ? pub.authors : [],
							pub.journal || null,
							pub.publicationDate || null,
							pub.doi || null,
							pub.abstract || null,
							pub.url || null,
							aiSummary,
							pub.source || 'external',
						]
					);
				} catch (pubInsertErr) {
					// Continue inserting others even if one fails
					console.error('Seed insert publication failed:', pubInsertErr?.message || pubInsertErr);
				}
			}
		}

		// Seed Clinical Trials if empty
		if (trialsCount === 0) {
			// Limit to first few conditions to avoid excessive calls
			const seedConditions = normalizedConditions.slice(0, 3);
			for (const cond of seedConditions) {
				try {
					const trials = await fetchClinicalTrialsGov(cond, 10);
					for (const t of trials) {
						try {
							// Deduplicate by title + condition
							const title = (t.title || '').trim();
							const condition = (t.condition || '').trim();
							const existing = await query(
								`SELECT id FROM clinical_trials WHERE LOWER(title) = LOWER($1) AND LOWER(COALESCE(condition, '')) = LOWER($2) LIMIT 1`,
								[title, condition]
							);
							if (existing.rows.length > 0) continue;

							let aiSummary = null;
							try {
								aiSummary = await generateAISummary(`${t.title || ''}\n${t.description || ''}`);
							} catch (_) {
								aiSummary = null;
							}

							await query(
								`INSERT INTO clinical_trials 
								 (researcher_id, title, description, condition, phase, status, location, eligibility_criteria, current_participants, target_participants, ai_summary)
								 VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, 0, NULL, $8)`,
								[
									t.title || '',
									t.description || null,
									t.condition || null,
									t.phase || null,
									t.status || null,
									t.location || null,
									null, // eligibility_criteria not available from API v2 mapping above
									aiSummary,
								]
							);
						} catch (trialInsertErr) {
							console.error('Seed insert clinical trial failed:', trialInsertErr?.message || trialInsertErr);
						}
					}
				} catch (trialFetchErr) {
					console.error('Seed fetch clinical trials failed:', trialFetchErr?.message || trialFetchErr);
				}
			}
		}
	} catch (error) {
		// Do not throw; this should be a best-effort seeding step
		console.error('ensureSeededForConditions failed:', error?.message || error);
	}

	// Final safety: if publications still empty (e.g., network blocked), insert minimal static seeds
	try {
		const pubsCountRes2 = await query('SELECT COUNT(*)::int AS count FROM publications');
		const publicationsCount2 = pubsCountRes2.rows[0]?.count || 0;
		if (publicationsCount2 === 0) {
			const staticSeeds = [
				{
					title: 'Recent Advances in Oncology: A Comprehensive Review',
					authors: ['Dr. Jane Doe', 'Dr. John Smith'],
					journal: 'International Journal of Oncology',
					publicationDate: '2022-01-01',
					doi: null,
					abstract: 'This review summarizes recent advances in oncology including immunotherapy and targeted treatments.',
					url: null,
					source: 'seed',
				},
				{
					title: 'Type 2 Diabetes Management: Emerging Therapies and Outcomes',
					authors: ['Dr. Alice Walker'],
					journal: 'Diabetes Care Reports',
					publicationDate: '2021-06-15',
					doi: null,
					abstract: 'An overview of emerging therapies for type 2 diabetes and their clinical outcomes.',
					url: null,
					source: 'seed',
				},
				{
					title: 'Cardiovascular Risk Reduction: A Multimodal Approach',
					authors: ['Dr. Robert Lee', 'Dr. Maria Gomez'],
					journal: 'Journal of Cardiology',
					publicationDate: '2020-10-10',
					doi: null,
					abstract: 'Discusses multimodal strategies to reduce cardiovascular risks in diverse populations.',
					url: null,
					source: 'seed',
				},
			];

			for (const pub of staticSeeds) {
				try {
					await query(
						`INSERT INTO publications 
						 (title, authors, journal, publication_date, doi, abstract, full_text_url, ai_summary, source)
						 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
						[
							pub.title,
							pub.authors,
							pub.journal,
							pub.publicationDate,
							pub.doi,
							pub.abstract,
							pub.url,
							null,
							pub.source,
						]
					);
				} catch (seedInsertErr) {
					console.error('Static seed insert publication failed:', seedInsertErr?.message || seedInsertErr);
				}
			}
		}
	} catch (finalErr) {
		console.error('Final static publication seeding failed:', finalErr?.message || finalErr);
	}
};

/**
 * Import publications from external APIs based on patient conditions
 * This is called when personalized queries return empty results
 * 
 * @param {string[]} conditions - Patient's health conditions
 * @returns {Promise<Array>} - Array of imported publications
 */
const importPublicationsForConditions = async (conditions = []) => {
	try {
		if (!Array.isArray(conditions) || conditions.length === 0) {
			console.log('No conditions provided for publication import');
			return [];
		}

		let importedPublications = [];
		
		// Limit to first 2 conditions to avoid excessive API calls
		const importConditions = conditions.slice(0, 2);
		console.log(`Importing publications from external APIs for conditions: ${importConditions.join(', ')}`);

		for (const cond of importConditions) {
			try {
				// Fetch from PubMed
				const pubmed = await fetchPubMedPublications(cond, 5);
				console.log(`Fetched ${pubmed.length} publications from PubMed for ${cond}`);
				importedPublications = importedPublications.concat(pubmed);

				// Fetch from Google Scholar (placeholder - likely empty)
				const scholar = await fetchGoogleScholarPublications(cond, 5);
				console.log(`Fetched ${scholar.length} publications from Google Scholar for ${cond}`);
				importedPublications = importedPublications.concat(scholar);

				// Fetch from ResearchGate (placeholder - likely empty)
				const rg = await fetchResearchGatePublicationsByQuery(cond, 5);
				console.log(`Fetched ${rg.length} publications from ResearchGate for ${cond}`);
				importedPublications = importedPublications.concat(rg);
			} catch (fetchErr) {
				console.error(`Error fetching publications for condition ${cond}:`, fetchErr?.message || fetchErr);
			}
		}

		// Insert imported publications into database
		const insertedPubs = [];
		for (const pub of importedPublications) {
			try {
				const doi = (pub.doi || '').trim();
				let exists = false;
				
				// Check if publication already exists by DOI
				if (doi) {
					const existingByDoi = await query('SELECT id FROM publications WHERE doi = $1', [doi]);
					exists = existingByDoi.rows.length > 0;
				}
				
				// Fallback: check by title
				if (!exists) {
					const title = (pub.title || '').trim();
					if (title) {
						const existingByTitle = await query(
							'SELECT id FROM publications WHERE LOWER(title) = LOWER($1) LIMIT 1',
							[title]
						);
						exists = existingByTitle.rows.length > 0;
					}
				}
				
				if (exists) {
					console.log(`Publication already exists: ${pub.title}`);
					continue;
				}

				// Generate AI summary
				let aiSummary = null;
				try {
					aiSummary = await generateAISummary(pub.abstract || pub.title || '');
				} catch (aiErr) {
					console.error('AI summary generation failed:', aiErr?.message || aiErr);
					aiSummary = null;
				}

				// Insert publication
				const result = await query(
					`INSERT INTO publications 
					 (title, authors, journal, publication_date, doi, abstract, full_text_url, ai_summary, source)
					 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
					 RETURNING *`,
					[
						pub.title || '',
						Array.isArray(pub.authors) ? pub.authors : [],
						pub.journal || null,
						pub.publicationDate || null,
						pub.doi || null,
						pub.abstract || null,
						pub.url || null,
						aiSummary,
						pub.source || 'external_import',
					]
				);
				
				if (result.rows.length > 0) {
					insertedPubs.push(result.rows[0]);
					console.log(`Imported publication: ${pub.title}`);
				}
			} catch (pubInsertErr) {
				console.error('Failed to insert publication:', pubInsertErr?.message || pubInsertErr);
			}
		}

		console.log(`Successfully imported ${insertedPubs.length} publications`);
		return insertedPubs;
	} catch (error) {
		console.error('importPublicationsForConditions failed:', error?.message || error);
		return [];
	}
};

module.exports = {
	ensureSeededForConditions,
	importPublicationsForConditions,
};


