# wgutils

This is a utility command to help with managing Working Groups. It was designed
for the GraphQL Working Groups, but could be used for other projects that work
in a similar way (if this is of interest, get in touch and we can figure out
how to make it even more configurable).

## Installation

```
yarn add wgutils
```

## wgutils init

Create an example `wg.config.js` file with the `wgutils init` command:

```
wgutils init
```

Then edit this file and customize it for the local repository.

## wg.config.js

Main options:

- `name` - name of the WG, e.g. `"GraphQL WG"`
- `repoUrl` - the root URL to the repo, e.g. `"https://github.com/graphql/graphql-wg"`
- `videoConferenceDetails` - the video conference URL; gets interpolated into the markdown, so if additional details (e.g. password) are required include them indented after a newline
- `liveNotesUrl` - the URL to the Google Doc that is used for the live notes
- `attendeesTemplate` - a markdown table for your attendees to populate
- `timezone` - `US/Pacific` or `UTC` or similar; what time governs your meeting times. Critical for international daylight savings time.
- `frequency` - `monthly` or `weekly` - how frequently do you meet
- `weekday` - `M`, `Tu`, `W`, `Th`, `F`, `Sa` or `Su` - which day of the week do you meet on?
- `time` - the time range of the meeting in strict 24 hour range format: `HH:MM-HH:MM` (e.g. `12:30-14:00`)

When `frequency = 'monthly'`:

- `nth` - 1-4 - which of the `weekdays` do you meet on?
- `secondaryMeetings` - are there additional meetings? If so, a list of them:
  - `nth` - which instance
  - `dayOffset` (_optional_) - if this meeting is a different day of the week, how does it relate to the normal schedule? (e.g. if you normally meet Thursdays, then Wednesday would be `-1`)
  - `time` - the time range of the meeting in strict 24 hour range format: `HH:MM-HH:MM` (e.g. `12:30-14:00`)
  - `name` (_optional_) - a name for this secondary meeting
  - `description` (_optional_) - a description for this secondary meeting
  - `filenameFragment` (_optional_) - extra text to add to the agenda filename

When `frequency = 'weekly'`:

- `primaryN` - which meeting is the primary (if any)? We really only support this being `1` right now...

Optional but important options:

- `joiningAMeetingFile` (_optional_) - if your repository contains a "JoiningAMeeting.md" file, name it here and we'll embed parts into the agendas
- `description` (_optional_) - description of the working group; will appear in agendas
- `dateAndTimeLocations` (_optional_) - the locations to add to the end of the `dateandtime.com` URL for the time of the meeting
- `filenameFragment` (_optional_) - extra text to add to the agenda filename

Options that are unlikely to be overridden for new projects:

- `links` (_optional_) - an object defining some named links to use in the markdown (e.g. from the `description`)
- `repoSubpath` (_optional_) - if the `agendas`/etc folder is not in the root, the relative path to it. Unlikely you'll need this.
- `agendasFolder` (_optional_) - the name of the folder the agendas are stored in (i.e. `"agendas"`), relative to `repoSubpath` (or the repo root)

## wgutils agenda gen

Generates agenda files for the given year and month, according to the settings
in `wg.config.js`.

```
wgutils agenda gen 2024 4
```

## Current limitations

These are known limitations of the software that we won't bother to address
unless there's a need to do so:

- Primary meeting must be the first meeting in the month (otherwise 'prior
  meetings' is not populated correctly)
