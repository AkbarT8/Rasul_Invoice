import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Rasul Proforma',
  description: 'Private Proforma & Order Management',
  robots: { index: false, follow: false }
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'react-hot-toast',
            style: { fontSize: 14, padding: '10px 14px', borderRadius: 10 }
          }}
        />
      </body>
    </html>
  );
}
