const axios = require('axios');

// Fetch publications from PubMed
const fetchPubMedPublications = async (query, maxResults = 10) => {
  try {
    const response = await axios.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi', {
      params: {
        db: 'pubmed',
        term: query,
        retmax: maxResults,
        retmode: 'json',
        api_key: process.env.PUBMED_API_KEY || '',
      },
    });

    const ids = response.data.esearchresult?.idlist || [];

    if (ids.length === 0) {
      return [];
    }

    // Fetch details for the IDs
    const detailsResponse = await axios.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi', {
      params: {
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'json',
        api_key: process.env.PUBMED_API_KEY || '',
      },
    });

    const publications = [];
    const results = detailsResponse.data.result;

    for (const id of ids) {
      const doc = results[id];
      if (doc) {
        publications.push({
          title: doc.title || '',
          authors: doc.authors?.map(a => a.name) || [],
          journal: doc.source || '',
          publicationDate: doc.pubdate || null,
          doi: doc.elocationid || '',
          abstract: doc.abstract || '',
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        });
      }
    }

    return publications;
  } catch (error) {
    console.error('Error fetching PubMed publications:', error);
    return [];
  }
};

// Fetch clinical trials from ClinicalTrials.gov
const fetchClinicalTrialsGov = async (query, maxResults = 10) => {
  try {
    const response = await axios.get('https://clinicaltrials.gov/api/v2/studies', {
      params: {
        'query.cond': query,
        pageSize: maxResults,
        format: 'json',
      },
    });

    const studies = response.data?.studies || [];
    return studies.map(study => ({
      nctId: study.protocolSection?.identificationModule?.nctId,
      title: study.protocolSection?.identificationModule?.briefTitle,
      description: study.protocolSection?.descriptionModule?.briefSummary,
      condition: study.protocolSection?.conditionsModule?.conditions?.[0]?.name,
      status: study.protocolSection?.statusModule?.overallStatus,
      phase: study.protocolSection?.designModule?.phases?.[0],
      location: study.protocolSection?.contactsLocationsModule?.locations?.[0]?.city,
      url: `https://clinicaltrials.gov/study/${study.protocolSection?.identificationModule?.nctId}`,
    }));
  } catch (error) {
    console.error('Error fetching ClinicalTrials.gov data:', error);
    return [];
  }
};

module.exports = {
  fetchPubMedPublications,
  fetchClinicalTrialsGov,
};

