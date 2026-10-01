import { Link } from "react-router-dom";
import { CassetteCase, CassetteTape } from "../components/Cassette";
import { NoteCard } from "../components/NoteCard";

export function HomePage() {
  return (
    <section className="home">
      <div className="hero">
        <NoteCard value="I made this for you! Enjoy creating <3" readOnly className="hero-note" />
        <div className="hero-tape">
          <CassetteTape coverId="brown-four" />
        </div>
        <div className="hero-case">
          <CassetteCase
            coverId="white-black"
            stickers={[
              { id: "fall-poststamp", rotation: -8 },
              { id: "fall-coffee", rotation: 6 },
              { id: "fall-leaf", rotation: 12 },
            ]}
            sideA={[]}
            sideB={[]}
          />
        </div>
      </div>
      <Link to="/create" className="btn btn-dark create-btn">
        Create a mixtape
      </Link>
    </section>
  );
}
