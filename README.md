# Clion

Simple CLI for [TJHSST Ion](https://github.com/tjcsl/ion)

Ion is the student-run Intranet for TJHSST

## Installation

To access the command globally, do a global install:

```bash
$ npm install -g naitian/Clion
```

*nix users might also have to add the following to their .bashrc file:

```bash
PATH=$PATH:/usr/local/share/npm/bin
```

To contribute to Clion, make sure to create a global symlink to the Clion directory

```bash
$ npm link /path/to/clion/
```

## CLI Usage

You can see the usage in the CLI directly by typing `clion` or `clion --help`.


## TODO
- [x] 8th Period Signups
- [X] 8th Period Activity Listings
- [ ] Color output (partially done)
- [ ] Change authenticaton to oauth


Future plans include making Clion a node package, among other various features and fixes.
