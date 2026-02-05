import Link from "next/link";

export default function ResumePage() {
  return (
    <main className="prose prose-lg mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold">Sean Smith</h1>

      <p className="mt-0">
        <strong>Phone:</strong> (615) 975-0179<br />
        <strong>Email:</strong> <a href="mailto:seanvsmith1901@gmail.com">seanvsmith1901@gmail.com</a><br />
        <strong>GitHub:</strong> <a href="https://github.com/seanvsmith1901">github.com/seanvsmith1901</a>
      </p>

      {/* Download button */}
      <Link
        href="/resume.pdf"
        download
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
      >
        Download Resume (PDF)
      </Link>

      <hr className="my-6" />

      <section>
        <h2>Education</h2>
        <p><strong>Brigham Young University</strong> — April 2027<br />Bachelor of Science: Computer Science, Emphasis in Machine Learning<br />Minor in Mathematics — Provo, UT</p>
        <ul>
          <li>GPA 3.97</li>
          <li>BYU Academic Scholarship</li>
          <li>Spanish OPIc Advanced Mid Rating</li>
        </ul>
      </section>

      <section>
        <h2>Experience</h2>
        <p><strong>Brigham Young University</strong> — Research Assistant<br />April 2024–Present — Provo, UT</p>
        <ul>
          <li>Assisting PhD students in creating tools for research studies — results available on GitHub (notably JHG-SC, aat_staghare, Xeno_Hunt).</li>
          <li>Building a new testbed for collaborative action research (Social Choice Dilemma).</li>
          <li>Extending published projects to explore novel research results.</li>
          <li>Consistent GitHub commit schedule (21 contributions in one day).</li>
          <li>Rapid adaptation to other researchers’ code bases.</li>
        </ul>
      </section>

      <section>
        <h2>Projects</h2>

        <h3>Server GUI (Python, pygame, websocket)</h3>
        <p>Built an experimental GUI for running human testing protocols with websocket-based communication.</p>

        <h3>Chess (Java, HTML, MySQL)</h3>
        <p>Fully functional Chess server supporting simultaneous matches with persistent game saving.</p>

        <h3>LeetCode Problems (Python)</h3>
        <p>Collections of solutions including SCC algorithms, dynamic programming, and recursion-heavy problems.</p>
      </section>

      <section>
        <h2>Skills</h2>
        <ul>
          <li><strong>Proficient:</strong> Python, Godot, Algorithm Design</li>
          <li><strong>Moderate:</strong> C++, Java, MySQL, Server–Client Systems</li>
        </ul>
      </section>

      <section>
        <h2>Volunteer Experience</h2>
        <p><strong>The Church of Jesus Christ of Latter-Day Saints</strong><br />Tuxtla Gutiérrez, Mexico — May 2021–May 2023</p>
        <ul>
          <li>Taught English classes to non-native speakers.</li>
          <li>Achieved Spanish OPIc “Superior” rating.</li>
          <li>Delivered engaging group lessons to up to 12 participants.</li>
          <li>Developed strong cold-calling and interpersonal sk
