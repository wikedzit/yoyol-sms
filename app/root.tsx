import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import type { Route } from './+types/root';
import './lib/csrf-client';
import './app.css';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/ui/theme-toggle';
import { LanguageProvider, useLanguage } from './lib/i18n';

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (

  // Added superssionHydrationWarning to avoid hydration mismatch warnings when using theme toggling 

    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      
      {/* added bg-background and text-foreground classes to ensure the body respects the theme state from ThemeProvider */}
      <body className="bg-background text-foreground antialiased min-h-screen">

        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>

        <Toaster richColors position="top-right" />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useLanguage();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{notFound ? t('errorNotFoundTitle') : t('errorTitle')}</h1>
      <p>{notFound ? t('errorNotFound') : t('errorUnexpected')}</p>
    </main>
  );
}