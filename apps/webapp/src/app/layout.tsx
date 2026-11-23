import './globals.css';
import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Taskboard</title>
        {/* Comment out this meta tag if you want to enable search engine crawling */}
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
