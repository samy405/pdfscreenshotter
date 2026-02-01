import { useTheme } from '../context/ThemeContext';
import styles from './AppShell.module.css';

type Props = {
  children: React.ReactNode;
};

export function AppShell({ children }: Props) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>PDF Screenshot Exporter</h1>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </header>
      <main className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        PDF Screenshot Exporter — Export PDF pages as images. Runs entirely in the browser.
      </footer>
    </div>
  );
}
