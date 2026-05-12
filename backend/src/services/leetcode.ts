import https from 'https';

/**
 * Fetches full question content from Leetcode's internal GraphQL API
 * Free — no Premium required for problem descriptions
 */
export async function fetchLeetcodeQuestion(slug: string): Promise<{
  content: string;
  exampleTestcases: string;
  hints: string[];
} | null> {
  const query = `
    query getQuestion($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        content
        exampleTestcases
        hints
      }
    }
  `;

  const body = JSON.stringify({ query, variables: { titleSlug: slug } });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'leetcode.com',
        path: '/graphql',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Referer': `https://leetcode.com/problems/${slug}/`,
          'User-Agent': 'Mozilla/5.0',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const q = json?.data?.question;
            if (q) {
              resolve({
                content: q.content || '',
                exampleTestcases: q.exampleTestcases || '',
                hints: q.hints || [],
              });
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}
