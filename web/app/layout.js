import './globals.css';
export const metadata = { title: 'Контент-завод', description: 'Платформа производства роликов' };
export default function RootLayout({ children }) {
  return (<html lang="ru"><body>{children}</body></html>);
}
