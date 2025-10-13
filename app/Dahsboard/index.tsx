import { Link } from 'react-router';

export function Dashboard() {
  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <header className="flex flex-col items-center gap-9">
          welcome to Yoyol Student Management System
          <p>The Dashboard is under construction </p>
          <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-md shadow-lg transition transform hover:scale-105">
            <Link to="/classes">Go to classes</Link>
          </button>
        </header>
      </div>
    </main>
  );
}
