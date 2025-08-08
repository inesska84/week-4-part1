// Vercel Serverless Function: /api/receive
// Purpose: Accept POST from n8n with an array of slide objects { slide_no, header, body, image, photo_desc, narration }
// and return a minimal HTML page that stores normalized data into sessionStorage
// under key "presentationData" with shape { slides: [...] }, then redirects to /presentation.html

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!Array.isArray(body)) {
      return res.status(400).json({ error: 'Invalid payload: expected an array of slides' });
    }

    // Normalize incoming slides to the shape expected by the frontend
    const slides = body.map((s, idx) => ({
      number: typeof s.slide_no === 'number' ? s.slide_no : idx + 1,
      header: s.header ?? '',
      body: s.body ?? '',
      image: s.image ?? '',
      photo_desc: s.photo_desc ?? '',
      narration: s.narration ?? ''
    }));

    const normalized = { slides };

    // Return HTML that writes to sessionStorage and redirects to presentation
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Receiving presentation...</title>
  </head>
  <body>
    <script>
      try {
        sessionStorage.setItem('presentationData', ${JSON.stringify(JSON.stringify(normalized))});
        window.location.replace('/presentation.html');
      } catch (e) {
        document.body.innerHTML = '<pre>' + e.message + '</pre>';
      }
    </script>
  </body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    return res.status(400).json({ error: 'Bad Request', details: String(err?.message || err) });
  }
}

