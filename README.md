# Compresso

**Solving "The Unread Problem: What Did I Miss?"**

Compresso turns hundreds of unread chat messages into a short, useful catch-up: what was decided, who owns what, what's due, and what you can safely ignore. Everything runs in your browser, so your chats never leave your device.

**Live demo:** https://local-first-compresso-rhkx.bolt.host/

---

## The Problem

You come back to a group chat with 300+ unread messages. Scrolling takes too long, and skipping risks missing a decision or a deadline.

## The Solution

Upload a chat export and Compresso gives you a compressed view of it:

- **Decisions** that were made
- **Action items** with the person responsible
- **Deadlines** and dates mentioned
- **Links** shared in the conversation
- **Noise filtered out** (small talk, reactions, off-topic chatter)

## Supported Formats

| Platform | Format |
|----------|--------|
| WhatsApp | `.txt` export (Android and iOS) |
| Telegram | `.json` export |
| Slack    | `.json` export |

Sample files for testing are in the [`samples/`](./samples) folder.

## Local-First by Design

- Chats are parsed and processed **in the browser**.
- No chat content is uploaded to a server.
- No account or login is needed.

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev

# 4. Build for production
npm run build
```

Open the local URL shown in the terminal, then upload a file from `samples/`.

## How to Use

1. Export a chat from WhatsApp, Telegram, or Slack.
2. Open Compresso and upload the file.
3. Pick the point you want to catch up from, such as "since yesterday" or "since I left."
4. Read the summary: decisions, tasks, deadlines, and links.

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Local parsing in the browser

> Update this list to match your `package.json`.

## Gen AI Usage

| Service | Where it was used |
|---------|-------------------|
| **Bolt AI** | Generated the initial UI and app scaffolding, and the project structure |
| **[Add any other tool]** | [Where you used it] |

Only the tools listed here were used to build this project.

## Accessibility

- Black text on light backgrounds in light mode for strong contrast
- Light and dark theme toggle
- [Add: keyboard navigation, ARIA labels, etc. if implemented]

## Testing

```bash
npm run test
```

> Add this section only if your tests run with this command.

## Project Structure

```
src/
  components/    UI components
  parsers/       WhatsApp, Telegram, Slack parsers
  utils/         Helper functions
  App.tsx        Main app
samples/         Test chat exports
```

> Adjust folder names to match your repo.

## Roadmap

- [ ] More chat platforms (Discord, Signal)
- [ ] Export the summary as PDF or text
- [ ] Multi-language chat support

## Author

**J Benito Nathanael**
Built for the "The Unread Problem" hackathon.

## License

MIT
