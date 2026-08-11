# Privacy Policy

**Effective date:** August 11, 2026  
**Last updated:** August 11, 2026  
**Application:** Application Bot (private Discord bot for the Bot Designer for Discord community)  
**Operator:** Oriel Beck ([GitHub](https://github.com/oriel-beck/application-bot))  
**Contact:** Discord user ID `311808747141857292`, or contact BDFD server staff who can reach the bot operator

This Privacy Policy explains what information the Application Bot (“the Bot”, “we”, “us”) collects, how it is used, where it is stored, and your choices. The Bot is a **private, invite-only** application intended for the Bot Designer for Discord (BDFD) Discord server. It is not offered as a public multi-server consumer product.

By using the Bot (slash commands, buttons, modals, DMs with the Bot, ticket channels, support threads, or related features), you agree to this Policy.

---

## 1. Who this applies to

This Policy applies to Discord users who interact with the Bot in the configured guild(s), including applicants, support users, staff, and moderators.

---

## 2. Information we collect

We process data that Discord makes available to the Bot when you use it, and data you submit through Bot features. Depending on the feature, this may include:

### 2.1 Discord identifiers and metadata

- Discord user IDs, usernames / display names (as provided by Discord)
- Channel, thread, message, guild, and role IDs needed to run features
- Interaction metadata (e.g. which command or button was used)

### 2.2 Staff applications

- Application questions and your answers
- Application state (e.g. pending, accepted, denied, deleted)
- Related message IDs and expiry timestamps used for review workflows

### 2.3 Ticket transcripts

In configured **ticket** channels, the Bot may store:

- Message content (text)
- Message ID, author user ID, channel ID, and timestamps

This is used so staff/owners can review or export ticket history.

### 2.4 Reports, blacklist, and moderation helpers

- Report content you submit and related user IDs
- Blacklist entries (user ID, reason, moderating staff ID) when staff use that feature

### 2.5 Optional AI assistant (BDFD AI)

When AI features are enabled by an owner:

- Natural-language questions you send via `/ai` or by **replying to the Bot** in supported support threads/tickets
- Temporary conversation turns (user and assistant messages) for reply-to-bot context in a channel
- Usage / rate-limit counters and related Redis keys

AI conversation history for a channel may be cleared when the ticket/thread is closed or cleaned up, when an owner deletes it, or after a period of inactivity (currently designed around 7 days of no AI activity for the AI state sweep). **Ticket transcripts are retained separately** under staff transcript controls.

### 2.6 Utility / guide content

- Message content from configured staff tip or guide channels may be read or indexed so commands like tips lookup work, and (if configured) so documentation/guide text can be ingested for AI retrieval

### 2.7 Share-your-bot channel helpers

- Cooldown and sticky-message state (user IDs, message IDs, TTL) used to enforce posting rules in the share-your-bot channel

We do **not** intentionally collect payment information, government IDs, or precise device location. Do not submit sensitive personal data in tickets, applications, or AI questions unless necessary for support.

---

## 3. How we use information

We use the information above to:

- Operate staff applications and staff review tools
- Provide support forum / ticket helpers and moderation utilities
- Create, store, export, and delete ticket transcripts for staff
- Run the optional BDFD AI assistant (documentation lookup and answers)
- Enforce cooldowns, permissions, and bot configuration
- Maintain security, prevent abuse, and debug failures
- Comply with Discord’s Developer Terms of Service and Developer Policy

We do **not** sell your personal data. We do **not** use Discord message content to **train** our own machine-learning models. When AI is used, message/question text may be sent to a third-party AI provider for **inference** (generating an answer / embeddings for retrieval), not for training models on your Discord data by us.

---

## 4. Where data is stored (off Discord)

Data processed by the Bot may be stored **outside Discord**, including:

| System | Typical contents |
|--------|------------------|
| **PostgreSQL** | Applications, questions, blacklist, settings, ticket transcripts/messages, AI conversation turns |
| **Redis** | Short-lived state (e.g. AI usage limits, share-your-bot cooldowns) |
| **Chroma** (vector store) | Embeddings / chunks from BDFD wiki, public BDFD API docs, and optionally staff guide/FAQ channel content used for AI retrieval |
| **OpenAI API** | Questions and relevant context sent to generate AI answers and embeddings for search (processed under OpenAI’s terms and policies) |

Infrastructure is operated by or for the Bot operator (e.g. VPS / Docker-hosted services). Access is limited to the operator and authorized technical staff.

---

## 5. Third-party processors

- **Discord** — platform that delivers interactions and message events to the Bot  
- **OpenAI** — AI inference and embeddings when BDFD AI features are used  
- Hosting / database providers used to run Postgres, Redis, Chroma, and the Bot process  

Their processing is governed by their own terms and privacy policies in addition to this Policy.

---

## 6. Message Content and privileged data

The Bot requests Discord **Message Content Intent** only as needed for features such as ticket transcripts, tip indexing, and AI reply-to-bot questions. It does **not** use Presence Intent. It does not require Server Members Intent for normal operation (individual member lookups may be performed on demand when deciding applications).

We do not perform server-wide logging of all guild messages. Message content storage is limited to the feature scopes described above.

---

## 7. Retention

| Data | Retention (typical) |
|------|---------------------|
| Applications / blacklist / settings | Kept while needed for staff operations; removable by authorized staff/owner commands or operator action |
| Ticket transcripts | Kept until deleted via transcript tools, ticket-close flows that remove them, or operator action |
| AI conversation turns | Cleared on channel cleanup, owner delete, or inactivity sweep; not used as permanent chat archives |
| Redis keys | Expire according to TTL / feature logic |
| AI vector index (wiki/guides) | Rebuilt/replaced when documentation ingest is re-run |

Exact retention may change as features are maintained; staff tools and operator procedures control deletion.

---

## 8. Your choices and requests

You can reduce collection by:

- Not opening or using ticket channels (avoids transcript logging of your ticket messages)
- Not using `/ai` and not replying to the Bot for AI help when AI is enabled
- Not submitting a staff application or report

To request access, correction, or deletion of data the Bot stores about you (for example application answers or transcript text), contact the operator via Discord (`311808747141857292`) or BDFD staff who can escalate to the operator. We may need to verify you control the Discord account in question. Some records may be retained where required for moderation, security, dispute resolution, or legal obligations.

Parents or guardians of users under the age required by Discord’s terms should ensure the user is allowed to use Discord and this Bot.

---

## 9. Security

We take reasonable technical and organizational measures (access-controlled servers, secrets in environment configuration, least-privilege operational access). No method of transmission or storage is 100% secure.

---

## 10. Children

The Bot is intended for users who are allowed to use Discord under Discord’s Terms of Service. We do not knowingly collect data from children in violation of those terms. If you believe a minor’s data was submitted improperly, contact us to request deletion where appropriate.

---

## 11. International users

The Bot and its databases may be hosted in jurisdictions different from where you live. By using the Bot, you understand your information may be processed in those locations.

---

## 12. Changes

We may update this Policy from time to time. The “Last updated” date will change when we do. Continued use of the Bot after an update means you accept the revised Policy. Material changes may also be announced in the BDFD server if appropriate.

---

## 13. Contact

Privacy questions or data requests: Discord `311808747141857292`, or via BDFD server staff.  
Source repository: [https://github.com/oriel-beck/application-bot](https://github.com/oriel-beck/application-bot)
