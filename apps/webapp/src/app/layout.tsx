import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Taskboard</title>
        {/* Comment out this meta tag if you want to enable search engine crawling */}
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
