# Polis-Rossa

Original software is licensed under **AGPL-3.0-or-later**, including its network-source obligations for modified versions. See [LICENSE](LICENSE), [NOTICE](NOTICE), [licensing scope](docs/LICENSING.md) and the separate [name and logo policy](TRADEMARKS.md). Contributors retain their copyright. Third-party publications and datasets retain their own terms; software warranty exclusions do not remove the operator's legal duties.

**News, knowledge and shared tools.** Polis-Rossa brings together socialist, communist, trade union and anti-colonial sources, links readers to original publishers, and offers a multilingual library and documented historical resources.

Its editorial orientation is explicit. Source selection is open to criticism and improvement; automated ranking does not certify accuracy. Translations can contain errors. Opening the original source remains essential for context, verification and support for the publisher.

[Italiano](README.md) · [Contribute in your language](CONTRIBUTING.md)

## Project status

This repository contains the independent application: React and TypeScript, Node.js APIs, PostgreSQL persistence and Better Auth accounts. The first independent deployment is being prepared. Its verified URL will be added here after deployment. Registration and forum writes are disabled by default until infrastructure, email delivery and operational requirements have been checked.

The application includes a searchable news review, separate reading and source languages, a six-hour world observatory, and video filters by language, country, subject and channel. The current catalogue includes 84 video channels, 170 books, essays and collections with 717 editions in 37 languages, plus separate indexes of author archives and historical collections.

Historical dossiers cite their sources. A data explorer compares 27 indicators across 217 countries or economies, using 178,224 available observations from 1960 to 2024. Missing observations are not replaced by invented values. A statistical comparison does not establish causation.

Personal accounts store saved articles, books and reading positions. A separate admission process grants participation in discussions and votes about the project's sources, news organization, bugs, features and operating rules. General member-only conversations need no poll. Proposals about the project include a discussion; voting rules are fixed when a proposal is published. Newly admitted members can vote in consultations that are still open; the electorate and quorum can grow until the deadline. Final ballots are attributed to accepted identities, with the disclosure explained before participation. The system is not an official identity service or a cryptographic guarantee against administrator interference.

## Contribute

Open [an issue](https://github.com/internazionalerossa/polisrossa/issues/new/choose), choose the appropriate form and describe the page, proposed change and reasons. Include verifiable sources for factual claims. All languages are welcome; coding is not required. See the [contribution guide](CONTRIBUTING.md) for editing files and submitting pull requests.

## Development

Node.js 24 and npm are required.

```sh
npm ci
npm run build
npm test
npm run typecheck
```

See [deployment instructions](docs/DEPLOYMENT.md) for PostgreSQL, local development, email delivery, migrations and Docker deployment. Production credentials and personal data do not belong in the repository. The public deployment is a separate step from publishing source code.

## License

Original code is licensed under [AGPL-3.0-or-later](LICENSE). The community process does not restrict the right to create derivative versions under the license. Third-party books, translations, articles, photographs, videos and datasets retain their own rights and terms. Free access does not imply permission to republish.

## Interactive library, forum and languages

The Library brings together free books, guided reading, history and comparative data. A short usage guide introduces the tools and links directly to the statistical archive. Interface and reading languages are independent; original content remains available.
