# ThisProjectDoesNotExist

**A living grimoire that conjures entire websites from thin air.**

## What is this?

You speak a name into the void. The void answers with a website.

ThisProjectDoesNotExist uses Google Gemini to generate complete, multi-page websites on the fly. Type in a project idea, navigate to any URL path you can dream up, and watch as fully-formed pages materialize before your eyes. Every page knows about the others. It's like your website was always there, waiting to be discovered.

It's not a mockup tool. It's not a prototyping suite. It's a sorcerer's workshop for people who want to see "what if this existed?"

## Quick Start

```bash
# Summon the repository
git clone https://github.com/AKotha-AIDEV/thisprojectdoesnotexist.git
cd thisprojectdoesnotexist

# Install the frontend incantations
npm install

# Install the backend incantations
cd backend
npm install

# Prepare your arcane key
cp .env.example .env
# Edit .env and add your Gemini API key
# Get one at https://makersuite.google.com/app/apikey
```

Now open two terminals:

```bash
# Terminal 1 - awaken the backend spirit
cd backend
npm run dev

# Terminal 2 - open the portal
npm run dev
```

Visit `http://localhost:5173`. Begin conjuring.

## How it Works

1. **Name your creation** on the landing page -- the grimoire needs to know what it's summoning
2. **Add instructions** if you want (optional whispers to guide the AI)
3. **Navigate anywhere** -- try `/about`, `/pricing`, `/dashboard`, `/literally-anything`
4. **The AI conjures a full page** for whatever path you visit, consistent with everything it's already created
5. **Visit `/end`** when you're done to export your creation as downloadable HTML files

The pages aren't templates. They aren't pre-built. Each one is conjured fresh by Gemini, aware of your project's name, purpose, and every page that came before it.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui
- **Backend:** Node.js, Express
- **AI:** Google Gemini (via @google/genai)
- **Vibes:** Arcane grimoire aesthetic with Cinzel font and dark sorcery

## License

MIT -- conjure freely.
