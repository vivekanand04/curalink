const axios = require('axios');

// Fetch publications from ORCID
const fetchORCIDPublications = async (orcidId, maxResults = 20) => {
  try {
    // ORCID Public API endpoint
    const response = await axios.get(`https://pub.orcid.org/v3.0/${orcidId}/works`, {
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const works = response.data?.group || [];
    const publications = [];

    for (const group of works.slice(0, maxResults)) {
      const work = group['work-summary']?.[0];
      if (work) {
        const title = work.title?.title?.value || work.title?.value || 'Untitled';
        const journal = work['journal-title']?.value || '';
        const publicationDate = work['publication-date']?.year?.value || null;
        const doi = work['external-ids']?.['external-id']?.find(id => id['external-id-type'] === 'doi')?.['external-id-value'] || '';
        
        publications.push({
          title,
          authors: [], // ORCID API structure varies, may need additional parsing
          journal,
          publicationDate: publicationDate ? `${publicationDate}-01-01` : null,
          doi,
          abstract: '',
          url: work.url?.value || `https://orcid.org/${orcidId}`,
        });
      }
    }

    return publications;
  } catch (error) {
    console.error('Error fetching ORCID publications:', error.message);
    return [];
  }
};

module.exports = {
  fetchORCIDPublications,
};

