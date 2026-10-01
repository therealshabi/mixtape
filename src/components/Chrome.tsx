import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="logo" aria-label="Mixtape for you">
        <span className="logo-mix">Mix</span>
        <span className="logo-tape">tape</span>
        <span className="logo-for">for you</span>
      </Link>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      A little cassette you can send to someone
    </footer>
  );
}
