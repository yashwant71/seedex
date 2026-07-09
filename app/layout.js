import './globals.css';

export const metadata = {
  title: 'Seedex — AI Seed Analysis',
  description: 'Scan seeds with your camera and get instant AI-powered identification, planting guides, and care instructions. Your smart botanical companion.',
  keywords: 'seed identification, plant scanner, gardening guide, AI botanist, seed analysis',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
