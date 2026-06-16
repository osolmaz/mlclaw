#!/usr/bin/env node
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x3) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x3, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x3)(function(x3) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x3 + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/commander/lib/error.js
var require_error = __commonJS({
  "node_modules/commander/lib/error.js"(exports) {
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       */
      constructor(exitCode, code, message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.exitCode = exitCode;
        this.nestedError = void 0;
      }
    };
    var InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
      }
    };
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
  }
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "node_modules/commander/lib/argument.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        this.description = description || "";
        this.variadic = false;
        this.parseArg = void 0;
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.argChoices = void 0;
        switch (name[0]) {
          case "<":
            this.required = true;
            this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = false;
            this._name = name.slice(1, -1);
            break;
          default:
            this.required = true;
            this._name = name;
            break;
        }
        if (this._name.endsWith("...")) {
          this.variadic = true;
          this._name = this._name.slice(0, -3);
        }
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @package
       */
      _collectValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        previous.push(value);
        return previous;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._collectValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Make argument required.
       *
       * @returns {Argument}
       */
      argRequired() {
        this.required = true;
        return this;
      }
      /**
       * Make argument optional.
       *
       * @returns {Argument}
       */
      argOptional() {
        this.required = false;
        return this;
      }
    };
    function humanReadableArgName(arg) {
      const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports.Argument = Argument2;
    exports.humanReadableArgName = humanReadableArgName;
  }
});

// node_modules/commander/lib/help.js
var require_help = __commonJS({
  "node_modules/commander/lib/help.js"(exports) {
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.minWidthToWrap = 40;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * prepareContext is called by Commander after applying overrides from `Command.configureHelp()`
       * and just before calling `formatHelp()`.
       *
       * Commander just uses the helpWidth and the rest is provided for optional use by more complex subclasses.
       *
       * @param {{ error?: boolean, helpWidth?: number, outputHasColors?: boolean }} contextOptions
       */
      prepareContext(contextOptions) {
        this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
        const helpCommand = cmd._getHelpCommand();
        if (helpCommand && !helpCommand._hidden) {
          visibleCommands.push(helpCommand);
        }
        if (this.sortSubcommands) {
          visibleCommands.sort((a, b) => {
            return a.name().localeCompare(b.name());
          });
        }
        return visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns {number}
       */
      compareOptions(a, b) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        const visibleOptions = cmd.options.filter((option) => !option.hidden);
        const helpOption = cmd._getHelpOption();
        if (helpOption && !helpOption.hidden) {
          const removeShort = helpOption.short && cmd._findOption(helpOption.short);
          const removeLong = helpOption.long && cmd._findOption(helpOption.long);
          if (!removeShort && !removeLong) {
            visibleOptions.push(helpOption);
          } else if (helpOption.long && !removeLong) {
            visibleOptions.push(
              cmd.createOption(helpOption.long, helpOption.description)
            );
          } else if (helpOption.short && !removeShort) {
            visibleOptions.push(
              cmd.createOption(helpOption.short, helpOption.description)
            );
          }
        }
        if (this.sortOptions) {
          visibleOptions.sort(this.compareOptions);
        }
        return visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions) return [];
        const globalOptions = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          const visibleOptions = ancestorCmd.options.filter(
            (option) => !option.hidden
          );
          globalOptions.push(...visibleOptions);
        }
        if (this.sortOptions) {
          globalOptions.sort(this.compareOptions);
        }
        return globalOptions;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        if (cmd._argsDescription) {
          cmd.registeredArguments.forEach((argument) => {
            argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
          });
        }
        if (cmd.registeredArguments.find((argument) => argument.description)) {
          return cmd.registeredArguments;
        }
        return [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => {
          return Math.max(
            max,
            this.displayWidth(
              helper.styleSubcommandTerm(helper.subcommandTerm(command))
            )
          );
        }, 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
          return Math.max(
            max,
            this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
          );
        }, 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
          return Math.max(
            max,
            this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
          );
        }, 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => {
          return Math.max(
            max,
            this.displayWidth(
              helper.styleArgumentTerm(helper.argumentTerm(argument))
            )
          );
        }, 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        if (cmd._aliases[0]) {
          cmdName = cmdName + "|" + cmd._aliases[0];
        }
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        }
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        const extraInfo = [];
        if (option.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (option.defaultValue !== void 0) {
          const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
          if (showDefault) {
            extraInfo.push(
              `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
            );
          }
        }
        if (option.presetArg !== void 0 && option.optional) {
          extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
        }
        if (option.envVar !== void 0) {
          extraInfo.push(`env: ${option.envVar}`);
        }
        if (extraInfo.length > 0) {
          const extraDescription = `(${extraInfo.join(", ")})`;
          if (option.description) {
            return `${option.description} ${extraDescription}`;
          }
          return extraDescription;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        const extraInfo = [];
        if (argument.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (argument.defaultValue !== void 0) {
          extraInfo.push(
            `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
          );
        }
        if (extraInfo.length > 0) {
          const extraDescription = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescription}`;
          }
          return extraDescription;
        }
        return argument.description;
      }
      /**
       * Format a list of items, given a heading and an array of formatted items.
       *
       * @param {string} heading
       * @param {string[]} items
       * @param {Help} helper
       * @returns string[]
       */
      formatItemList(heading, items, helper) {
        if (items.length === 0) return [];
        return [helper.styleTitle(heading), ...items, ""];
      }
      /**
       * Group items by their help group heading.
       *
       * @param {Command[] | Option[]} unsortedItems
       * @param {Command[] | Option[]} visibleItems
       * @param {Function} getGroup
       * @returns {Map<string, Command[] | Option[]>}
       */
      groupItems(unsortedItems, visibleItems, getGroup) {
        const result = /* @__PURE__ */ new Map();
        unsortedItems.forEach((item) => {
          const group = getGroup(item);
          if (!result.has(group)) result.set(group, []);
        });
        visibleItems.forEach((item) => {
          const group = getGroup(item);
          if (!result.has(group)) {
            result.set(group, []);
          }
          result.get(group).push(item);
        });
        return result;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth ?? 80;
        function callFormatItem(term, description) {
          return helper.formatItem(term, termWidth, description, helper);
        }
        let output = [
          `${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`,
          ""
        ];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([
            helper.boxWrap(
              helper.styleCommandDescription(commandDescription),
              helpWidth
            ),
            ""
          ]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return callFormatItem(
            helper.styleArgumentTerm(helper.argumentTerm(argument)),
            helper.styleArgumentDescription(helper.argumentDescription(argument))
          );
        });
        output = output.concat(
          this.formatItemList("Arguments:", argumentList, helper)
        );
        const optionGroups = this.groupItems(
          cmd.options,
          helper.visibleOptions(cmd),
          (option) => option.helpGroupHeading ?? "Options:"
        );
        optionGroups.forEach((options, group) => {
          const optionList = options.map((option) => {
            return callFormatItem(
              helper.styleOptionTerm(helper.optionTerm(option)),
              helper.styleOptionDescription(helper.optionDescription(option))
            );
          });
          output = output.concat(this.formatItemList(group, optionList, helper));
        });
        if (helper.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return callFormatItem(
              helper.styleOptionTerm(helper.optionTerm(option)),
              helper.styleOptionDescription(helper.optionDescription(option))
            );
          });
          output = output.concat(
            this.formatItemList("Global Options:", globalOptionList, helper)
          );
        }
        const commandGroups = this.groupItems(
          cmd.commands,
          helper.visibleCommands(cmd),
          (sub) => sub.helpGroup() || "Commands:"
        );
        commandGroups.forEach((commands, group) => {
          const commandList = commands.map((sub) => {
            return callFormatItem(
              helper.styleSubcommandTerm(helper.subcommandTerm(sub)),
              helper.styleSubcommandDescription(helper.subcommandDescription(sub))
            );
          });
          output = output.concat(this.formatItemList(group, commandList, helper));
        });
        return output.join("\n");
      }
      /**
       * Return display width of string, ignoring ANSI escape sequences. Used in padding and wrapping calculations.
       *
       * @param {string} str
       * @returns {number}
       */
      displayWidth(str) {
        return stripColor(str).length;
      }
      /**
       * Style the title for displaying in the help. Called with 'Usage:', 'Options:', etc.
       *
       * @param {string} str
       * @returns {string}
       */
      styleTitle(str) {
        return str;
      }
      styleUsage(str) {
        return str.split(" ").map((word) => {
          if (word === "[options]") return this.styleOptionText(word);
          if (word === "[command]") return this.styleSubcommandText(word);
          if (word[0] === "[" || word[0] === "<")
            return this.styleArgumentText(word);
          return this.styleCommandText(word);
        }).join(" ");
      }
      styleCommandDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleOptionDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleSubcommandDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleArgumentDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleDescriptionText(str) {
        return str;
      }
      styleOptionTerm(str) {
        return this.styleOptionText(str);
      }
      styleSubcommandTerm(str) {
        return str.split(" ").map((word) => {
          if (word === "[options]") return this.styleOptionText(word);
          if (word[0] === "[" || word[0] === "<")
            return this.styleArgumentText(word);
          return this.styleSubcommandText(word);
        }).join(" ");
      }
      styleArgumentTerm(str) {
        return this.styleArgumentText(str);
      }
      styleOptionText(str) {
        return str;
      }
      styleArgumentText(str) {
        return str;
      }
      styleSubcommandText(str) {
        return str;
      }
      styleCommandText(str) {
        return str;
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Detect manually wrapped and indented strings by checking for line break followed by whitespace.
       *
       * @param {string} str
       * @returns {boolean}
       */
      preformatted(str) {
        return /\n[^\S\r\n]/.test(str);
      }
      /**
       * Format the "item", which consists of a term and description. Pad the term and wrap the description, indenting the following lines.
       *
       * So "TTT", 5, "DDD DDDD DD DDD" might be formatted for this.helpWidth=17 like so:
       *   TTT  DDD DDDD
       *        DD DDD
       *
       * @param {string} term
       * @param {number} termWidth
       * @param {string} description
       * @param {Help} helper
       * @returns {string}
       */
      formatItem(term, termWidth, description, helper) {
        const itemIndent = 2;
        const itemIndentStr = " ".repeat(itemIndent);
        if (!description) return itemIndentStr + term;
        const paddedTerm = term.padEnd(
          termWidth + term.length - helper.displayWidth(term)
        );
        const spacerWidth = 2;
        const helpWidth = this.helpWidth ?? 80;
        const remainingWidth = helpWidth - termWidth - spacerWidth - itemIndent;
        let formattedDescription;
        if (remainingWidth < this.minWidthToWrap || helper.preformatted(description)) {
          formattedDescription = description;
        } else {
          const wrappedDescription = helper.boxWrap(description, remainingWidth);
          formattedDescription = wrappedDescription.replace(
            /\n/g,
            "\n" + " ".repeat(termWidth + spacerWidth)
          );
        }
        return itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `
${itemIndentStr}`);
      }
      /**
       * Wrap a string at whitespace, preserving existing line breaks.
       * Wrapping is skipped if the width is less than `minWidthToWrap`.
       *
       * @param {string} str
       * @param {number} width
       * @returns {string}
       */
      boxWrap(str, width) {
        if (width < this.minWidthToWrap) return str;
        const rawLines = str.split(/\r\n|\n/);
        const chunkPattern = /[\s]*[^\s]+/g;
        const wrappedLines = [];
        rawLines.forEach((line) => {
          const chunks = line.match(chunkPattern);
          if (chunks === null) {
            wrappedLines.push("");
            return;
          }
          let sumChunks = [chunks.shift()];
          let sumWidth = this.displayWidth(sumChunks[0]);
          chunks.forEach((chunk) => {
            const visibleWidth = this.displayWidth(chunk);
            if (sumWidth + visibleWidth <= width) {
              sumChunks.push(chunk);
              sumWidth += visibleWidth;
              return;
            }
            wrappedLines.push(sumChunks.join(""));
            const nextChunk = chunk.trimStart();
            sumChunks = [nextChunk];
            sumWidth = this.displayWidth(nextChunk);
          });
          wrappedLines.push(sumChunks.join(""));
        });
        return wrappedLines.join("\n");
      }
    };
    function stripColor(str) {
      const sgrPattern = /\x1b\[\d*(;\d*)*m/g;
      return str.replace(sgrPattern, "");
    }
    exports.Help = Help2;
    exports.stripColor = stripColor;
  }
});

// node_modules/commander/lib/option.js
var require_option = __commonJS({
  "node_modules/commander/lib/option.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags;
        this.description = description || "";
        this.required = flags.includes("<");
        this.optional = flags.includes("[");
        this.variadic = /\w\.\.\.[>\]]$/.test(flags);
        this.mandatory = false;
        const optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag;
        this.long = optionFlags.longFlag;
        this.negate = false;
        if (this.long) {
          this.negate = this.long.startsWith("--no-");
        }
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.presetArg = void 0;
        this.envVar = void 0;
        this.parseArg = void 0;
        this.hidden = false;
        this.argChoices = void 0;
        this.conflictsWith = [];
        this.implied = void 0;
        this.helpGroupHeading = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        this.presetArg = arg;
        return this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {(string | string[])} names
       * @return {Option}
       */
      conflicts(names) {
        this.conflictsWith = this.conflictsWith.concat(names);
        return this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        if (typeof impliedOptionValues === "string") {
          newImplied = { [impliedOptionValues]: true };
        }
        this.implied = Object.assign(this.implied || {}, newImplied);
        return this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        this.envVar = name;
        return this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = true) {
        this.mandatory = !!mandatory;
        return this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = true) {
        this.hidden = !!hide;
        return this;
      }
      /**
       * @package
       */
      _collectValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        previous.push(value);
        return previous;
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._collectValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        if (this.long) {
          return this.long.replace(/^--/, "");
        }
        return this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as an object attribute key.
       *
       * @return {string}
       */
      attributeName() {
        if (this.negate) {
          return camelcase(this.name().replace(/^no-/, ""));
        }
        return camelcase(this.name());
      }
      /**
       * Set the help group heading.
       *
       * @param {string} heading
       * @return {Option}
       */
      helpGroup(heading) {
        this.helpGroupHeading = heading;
        return this;
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @package
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @package
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    };
    var DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options.forEach((option) => {
          if (option.negate) {
            this.negativeOptions.set(option.attributeName(), option);
          } else {
            this.positiveOptions.set(option.attributeName(), option);
          }
        });
        this.negativeOptions.forEach((value, key) => {
          if (this.positiveOptions.has(key)) {
            this.dualOptions.add(key);
          }
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str) {
      return str.split("-").reduce((str2, word) => {
        return str2 + word[0].toUpperCase() + word.slice(1);
      });
    }
    function splitOptionFlags(flags) {
      let shortFlag;
      let longFlag;
      const shortFlagExp = /^-[^-]$/;
      const longFlagExp = /^--[^-]/;
      const flagParts = flags.split(/[ |,]+/).concat("guard");
      if (shortFlagExp.test(flagParts[0])) shortFlag = flagParts.shift();
      if (longFlagExp.test(flagParts[0])) longFlag = flagParts.shift();
      if (!shortFlag && shortFlagExp.test(flagParts[0]))
        shortFlag = flagParts.shift();
      if (!shortFlag && longFlagExp.test(flagParts[0])) {
        shortFlag = longFlag;
        longFlag = flagParts.shift();
      }
      if (flagParts[0].startsWith("-")) {
        const unsupportedFlag = flagParts[0];
        const baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
        if (/^-[^-][^-]/.test(unsupportedFlag))
          throw new Error(
            `${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`
          );
        if (shortFlagExp.test(unsupportedFlag))
          throw new Error(`${baseError}
- too many short flags`);
        if (longFlagExp.test(unsupportedFlag))
          throw new Error(`${baseError}
- too many long flags`);
        throw new Error(`${baseError}
- unrecognised flag format`);
      }
      if (shortFlag === void 0 && longFlag === void 0)
        throw new Error(
          `option creation failed due to no flags found in '${flags}'.`
        );
      return { shortFlag, longFlag };
    }
    exports.Option = Option2;
    exports.DualOptions = DualOptions;
  }
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "node_modules/commander/lib/suggestSimilar.js"(exports) {
    var maxDistance = 3;
    function editDistance(a, b) {
      if (Math.abs(a.length - b.length) > maxDistance)
        return Math.max(a.length, b.length);
      const d = [];
      for (let i = 0; i <= a.length; i++) {
        d[i] = [i];
      }
      for (let j2 = 0; j2 <= b.length; j2++) {
        d[0][j2] = j2;
      }
      for (let j2 = 1; j2 <= b.length; j2++) {
        for (let i = 1; i <= a.length; i++) {
          let cost = 1;
          if (a[i - 1] === b[j2 - 1]) {
            cost = 0;
          } else {
            cost = 1;
          }
          d[i][j2] = Math.min(
            d[i - 1][j2] + 1,
            // deletion
            d[i][j2 - 1] + 1,
            // insertion
            d[i - 1][j2 - 1] + cost
            // substitution
          );
          if (i > 1 && j2 > 1 && a[i - 1] === b[j2 - 2] && a[i - 2] === b[j2 - 1]) {
            d[i][j2] = Math.min(d[i][j2], d[i - 2][j2 - 2] + 1);
          }
        }
      }
      return d[a.length][b.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0) return "";
      candidates = Array.from(new Set(candidates));
      const searchingOptions = word.startsWith("--");
      if (searchingOptions) {
        word = word.slice(2);
        candidates = candidates.map((candidate) => candidate.slice(2));
      }
      let similar = [];
      let bestDistance = maxDistance;
      const minSimilarity = 0.4;
      candidates.forEach((candidate) => {
        if (candidate.length <= 1) return;
        const distance = editDistance(word, candidate);
        const length = Math.max(word.length, candidate.length);
        const similarity = (length - distance) / length;
        if (similarity > minSimilarity) {
          if (distance < bestDistance) {
            bestDistance = distance;
            similar = [candidate];
          } else if (distance === bestDistance) {
            similar.push(candidate);
          }
        }
      });
      similar.sort((a, b) => a.localeCompare(b));
      if (searchingOptions) {
        similar = similar.map((candidate) => `--${candidate}`);
      }
      if (similar.length > 1) {
        return `
(Did you mean one of ${similar.join(", ")}?)`;
      }
      if (similar.length === 1) {
        return `
(Did you mean ${similar[0]}?)`;
      }
      return "";
    }
    exports.suggestSimilar = suggestSimilar;
  }
});

// node_modules/commander/lib/command.js
var require_command = __commonJS({
  "node_modules/commander/lib/command.js"(exports) {
    var EventEmitter = __require("node:events").EventEmitter;
    var childProcess = __require("node:child_process");
    var path4 = __require("node:path");
    var fs5 = __require("node:fs");
    var process3 = __require("node:process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2, stripColor } = require_help();
    var { Option: Option2, DualOptions } = require_option();
    var { suggestSimilar } = require_suggestSimilar();
    var Command2 = class _Command extends EventEmitter {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super();
        this.commands = [];
        this.options = [];
        this.parent = null;
        this._allowUnknownOption = false;
        this._allowExcessArguments = false;
        this.registeredArguments = [];
        this._args = this.registeredArguments;
        this.args = [];
        this.rawArgs = [];
        this.processedArgs = [];
        this._scriptPath = null;
        this._name = name || "";
        this._optionValues = {};
        this._optionValueSources = {};
        this._storeOptionsAsProperties = false;
        this._actionHandler = null;
        this._executableHandler = false;
        this._executableFile = null;
        this._executableDir = null;
        this._defaultCommandName = null;
        this._exitCallback = null;
        this._aliases = [];
        this._combineFlagAndOptionalValue = true;
        this._description = "";
        this._summary = "";
        this._argsDescription = void 0;
        this._enablePositionalOptions = false;
        this._passThroughOptions = false;
        this._lifeCycleHooks = {};
        this._showHelpAfterError = false;
        this._showSuggestionAfterError = true;
        this._savedState = null;
        this._outputConfiguration = {
          writeOut: (str) => process3.stdout.write(str),
          writeErr: (str) => process3.stderr.write(str),
          outputError: (str, write) => write(str),
          getOutHelpWidth: () => process3.stdout.isTTY ? process3.stdout.columns : void 0,
          getErrHelpWidth: () => process3.stderr.isTTY ? process3.stderr.columns : void 0,
          getOutHasColors: () => useColor() ?? (process3.stdout.isTTY && process3.stdout.hasColors?.()),
          getErrHasColors: () => useColor() ?? (process3.stderr.isTTY && process3.stderr.hasColors?.()),
          stripColor: (str) => stripColor(str)
        };
        this._hidden = false;
        this._helpOption = void 0;
        this._addImplicitHelpCommand = void 0;
        this._helpCommand = void 0;
        this._helpConfiguration = {};
        this._helpGroupHeading = void 0;
        this._defaultCommandGroup = void 0;
        this._defaultOptionGroup = void 0;
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        this._outputConfiguration = sourceCommand._outputConfiguration;
        this._helpOption = sourceCommand._helpOption;
        this._helpCommand = sourceCommand._helpCommand;
        this._helpConfiguration = sourceCommand._helpConfiguration;
        this._exitCallback = sourceCommand._exitCallback;
        this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
        this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
        this._allowExcessArguments = sourceCommand._allowExcessArguments;
        this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
        this._showHelpAfterError = sourceCommand._showHelpAfterError;
        this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
        return this;
      }
      /**
       * @returns {Command[]}
       * @private
       */
      _getCommandAndAncestors() {
        const result = [];
        for (let command = this; command; command = command.parent) {
          result.push(command);
        }
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc;
        let opts = execOpts;
        if (typeof desc === "object" && desc !== null) {
          opts = desc;
          desc = null;
        }
        opts = opts || {};
        const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const cmd = this.createCommand(name);
        if (desc) {
          cmd.description(desc);
          cmd._executableHandler = true;
        }
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        cmd._hidden = !!(opts.noHelp || opts.hidden);
        cmd._executableFile = opts.executableFile || null;
        if (args) cmd.arguments(args);
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd.copyInheritedSettings(this);
        if (desc) return this;
        return cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        if (configuration === void 0) return this._helpConfiguration;
        this._helpConfiguration = configuration;
        return this;
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // change how output being written, defaults to stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // change how output being written for errors, defaults to writeErr
       *     outputError(str, write) // used for displaying errors and not used for displaying help
       *     // specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // color support, currently only used with Help
       *     getOutHasColors()
       *     getErrHasColors()
       *     stripColor() // used to remove ANSI escape codes if output does not have colors
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0) return this._outputConfiguration;
        this._outputConfiguration = {
          ...this._outputConfiguration,
          ...configuration
        };
        return this;
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {(boolean|string)} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = true) {
        if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
        this._showHelpAfterError = displayHelp;
        return this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = true) {
        this._showSuggestionAfterError = !!displaySuggestion;
        return this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name) {
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        }
        opts = opts || {};
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        if (opts.noHelp || opts.hidden) cmd._hidden = true;
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd._checkForBrokenPassThrough();
        return this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom argument processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, parseArg, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof parseArg === "function") {
          argument.default(defaultValue).argParser(parseArg);
        } else {
          argument.default(parseArg);
        }
        this.addArgument(argument);
        return this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        });
        return this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        const previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument?.variadic) {
          throw new Error(
            `only the last argument can be variadic '${previousArgument.name()}'`
          );
        }
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
          throw new Error(
            `a default value for a required argument is never used: '${argument.name()}'`
          );
        }
        this.registeredArguments.push(argument);
        return this;
      }
      /**
       * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
       *
       * @example
       *    program.helpCommand('help [cmd]');
       *    program.helpCommand('help [cmd]', 'show help');
       *    program.helpCommand(false); // suppress default help command
       *    program.helpCommand(true); // add help command even if no subcommands
       *
       * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
       * @param {string} [description] - custom description
       * @return {Command} `this` command for chaining
       */
      helpCommand(enableOrNameAndArgs, description) {
        if (typeof enableOrNameAndArgs === "boolean") {
          this._addImplicitHelpCommand = enableOrNameAndArgs;
          if (enableOrNameAndArgs && this._defaultCommandGroup) {
            this._initCommandGroup(this._getHelpCommand());
          }
          return this;
        }
        const nameAndArgs = enableOrNameAndArgs ?? "help [command]";
        const [, helpName, helpArgs] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const helpDescription = description ?? "display help for command";
        const helpCommand = this.createCommand(helpName);
        helpCommand.helpOption(false);
        if (helpArgs) helpCommand.arguments(helpArgs);
        if (helpDescription) helpCommand.description(helpDescription);
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        if (enableOrNameAndArgs || description) this._initCommandGroup(helpCommand);
        return this;
      }
      /**
       * Add prepared custom help command.
       *
       * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
       * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(helpCommand, deprecatedDescription) {
        if (typeof helpCommand !== "object") {
          this.helpCommand(helpCommand, deprecatedDescription);
          return this;
        }
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        this._initCommandGroup(helpCommand);
        return this;
      }
      /**
       * Lazy create help command.
       *
       * @return {(Command|null)}
       * @package
       */
      _getHelpCommand() {
        const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
        if (hasImplicitHelpCommand) {
          if (this._helpCommand === void 0) {
            this.helpCommand(void 0, void 0);
          }
          return this._helpCommand;
        }
        return null;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        const allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event)) {
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        if (this._lifeCycleHooks[event]) {
          this._lifeCycleHooks[event].push(listener);
        } else {
          this._lifeCycleHooks[event] = [listener];
        }
        return this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        if (fn) {
          this._exitCallback = fn;
        } else {
          this._exitCallback = (err) => {
            if (err.code !== "commander.executeSubCommandAsync") {
              throw err;
            } else {
            }
          };
        }
        return this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @private
       */
      _exit(exitCode, code, message) {
        if (this._exitCallback) {
          this._exitCallback(new CommanderError2(exitCode, code, message));
        }
        process3.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        const listener = (args) => {
          const expectedArgsCount = this.registeredArguments.length;
          const actionArgs = args.slice(0, expectedArgsCount);
          if (this._storeOptionsAsProperties) {
            actionArgs[expectedArgsCount] = this;
          } else {
            actionArgs[expectedArgsCount] = this.opts();
          }
          actionArgs.push(this);
          return fn.apply(this, actionArgs);
        };
        this._actionHandler = listener;
        return this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {(Option | Argument)} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            const message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Check for option flag conflicts.
       * Register option if no conflicts found, or throw on conflict.
       *
       * @param {Option} option
       * @private
       */
      _registerOption(option) {
        const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
        if (matchingOption) {
          const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
          throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
        }
        this._initOptionGroup(option);
        this.options.push(option);
      }
      /**
       * Check for command name and alias conflicts with existing commands.
       * Register command if no conflicts found, or throw on conflict.
       *
       * @param {Command} command
       * @private
       */
      _registerCommand(command) {
        const knownBy = (cmd) => {
          return [cmd.name()].concat(cmd.aliases());
        };
        const alreadyUsed = knownBy(command).find(
          (name) => this._findCommand(name)
        );
        if (alreadyUsed) {
          const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
          const newCmd = knownBy(command).join("|");
          throw new Error(
            `cannot add command '${newCmd}' as already have command '${existingCmd}'`
          );
        }
        this._initCommandGroup(command);
        this.commands.push(command);
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        this._registerOption(option);
        const oname = option.name();
        const name = option.attributeName();
        if (option.negate) {
          const positiveLongFlag = option.long.replace(/^--no-/, "--");
          if (!this._findOption(positiveLongFlag)) {
            this.setOptionValueWithSource(
              name,
              option.defaultValue === void 0 ? true : option.defaultValue,
              "default"
            );
          }
        } else if (option.defaultValue !== void 0) {
          this.setOptionValueWithSource(name, option.defaultValue, "default");
        }
        const handleOptionValue = (val, invalidValueMessage, valueSource) => {
          if (val == null && option.presetArg !== void 0) {
            val = option.presetArg;
          }
          const oldValue = this.getOptionValue(name);
          if (val !== null && option.parseArg) {
            val = this._callParseArg(option, val, oldValue, invalidValueMessage);
          } else if (val !== null && option.variadic) {
            val = option._collectValue(val, oldValue);
          }
          if (val == null) {
            if (option.negate) {
              val = false;
            } else if (option.isBoolean() || option.optional) {
              val = true;
            } else {
              val = "";
            }
          }
          this.setOptionValueWithSource(name, val, valueSource);
        };
        this.on("option:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        });
        if (option.envVar) {
          this.on("optionEnv:" + oname, (val) => {
            const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
            handleOptionValue(val, invalidValueMessage, "env");
          });
        }
        return this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @return {Command} `this` command for chaining
       * @private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags === "object" && flags instanceof Option2) {
          throw new Error(
            "To add an Option object use addOption() instead of option() or requiredOption()"
          );
        }
        const option = this.createOption(flags, description);
        option.makeOptionMandatory(!!config.mandatory);
        if (typeof fn === "function") {
          option.default(defaultValue).argParser(fn);
        } else if (fn instanceof RegExp) {
          const regex = fn;
          fn = (val, def) => {
            const m2 = regex.exec(val);
            return m2 ? m2[0] : def;
          };
          option.default(defaultValue).argParser(fn);
        } else {
          option.default(fn);
        }
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('--pt, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
       * Add a required option which must have a value after parsing. This usually means
       * the option must be specified on the command line. (Otherwise the same as .option().)
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx(
          { mandatory: true },
          flags,
          description,
          parseArg,
          defaultValue
        );
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
       * @return {Command} `this` command for chaining
       */
      combineFlagAndOptionalValue(combine = true) {
        this._combineFlagAndOptionalValue = !!combine;
        return this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
       * @return {Command} `this` command for chaining
       */
      allowUnknownOption(allowUnknown = true) {
        this._allowUnknownOption = !!allowUnknown;
        return this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
       * @return {Command} `this` command for chaining
       */
      allowExcessArguments(allowExcess = true) {
        this._allowExcessArguments = !!allowExcess;
        return this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {boolean} [positional]
       * @return {Command} `this` command for chaining
       */
      enablePositionalOptions(positional = true) {
        this._enablePositionalOptions = !!positional;
        return this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {boolean} [passThrough] for unknown options.
       * @return {Command} `this` command for chaining
       */
      passThroughOptions(passThrough = true) {
        this._passThroughOptions = !!passThrough;
        this._checkForBrokenPassThrough();
        return this;
      }
      /**
       * @private
       */
      _checkForBrokenPassThrough() {
        if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
          throw new Error(
            `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
          );
        }
      }
      /**
       * Whether to store option values as properties on command object,
       * or store separately (specify false). In both cases the option values can be accessed using .opts().
       *
       * @param {boolean} [storeAsProperties=true]
       * @return {Command} `this` command for chaining
       */
      storeOptionsAsProperties(storeAsProperties = true) {
        if (this.options.length) {
          throw new Error("call .storeOptionsAsProperties() before adding options");
        }
        if (Object.keys(this._optionValues).length) {
          throw new Error(
            "call .storeOptionsAsProperties() before setting option values"
          );
        }
        this._storeOptionsAsProperties = !!storeAsProperties;
        return this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {object} value
       */
      getOptionValue(key) {
        if (this._storeOptionsAsProperties) {
          return this[key];
        }
        return this._optionValues[key];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key, value) {
        return this.setOptionValueWithSource(key, value, void 0);
      }
      /**
       * Store option value and where the value came from.
       *
       * @param {string} key
       * @param {object} value
       * @param {string} source - expected values are default/config/env/cli/implied
       * @return {Command} `this` command for chaining
       */
      setOptionValueWithSource(key, value, source) {
        if (this._storeOptionsAsProperties) {
          this[key] = value;
        } else {
          this._optionValues[key] = value;
        }
        this._optionValueSources[key] = source;
        return this;
      }
      /**
       * Get source of option value.
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSource(key) {
        return this._optionValueSources[key];
      }
      /**
       * Get source of option value. See also .optsWithGlobals().
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSourceWithGlobals(key) {
        let source;
        this._getCommandAndAncestors().forEach((cmd) => {
          if (cmd.getOptionValueSource(key) !== void 0) {
            source = cmd.getOptionValueSource(key);
          }
        });
        return source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv)) {
          throw new Error("first parameter to parse must be array or undefined");
        }
        parseOptions = parseOptions || {};
        if (argv === void 0 && parseOptions.from === void 0) {
          if (process3.versions?.electron) {
            parseOptions.from = "electron";
          }
          const execArgv = process3.execArgv ?? [];
          if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
            parseOptions.from = "eval";
          }
        }
        if (argv === void 0) {
          argv = process3.argv;
        }
        this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
            break;
          case "electron":
            if (process3.defaultApp) {
              this._scriptPath = argv[1];
              userArgs = argv.slice(2);
            } else {
              userArgs = argv.slice(1);
            }
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          case "eval":
            userArgs = argv.slice(1);
            break;
          default:
            throw new Error(
              `unexpected parse option { from: '${parseOptions.from}' }`
            );
        }
        if (!this._name && this._scriptPath)
          this.nameFromFilename(this._scriptPath);
        this._name = this._name || "program";
        return userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * program.parse(); // parse process.argv and auto-detect electron and special node flags
       * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        this._prepareForParse();
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
       * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        this._prepareForParse();
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      _prepareForParse() {
        if (this._savedState === null) {
          this.saveStateBeforeParse();
        } else {
          this.restoreStateBeforeParse();
        }
      }
      /**
       * Called the first time parse is called to save state and allow a restore before subsequent calls to parse.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state saved.
       */
      saveStateBeforeParse() {
        this._savedState = {
          // name is stable if supplied by author, but may be unspecified for root command and deduced during parsing
          _name: this._name,
          // option values before parse have default values (including false for negated options)
          // shallow clones
          _optionValues: { ...this._optionValues },
          _optionValueSources: { ...this._optionValueSources }
        };
      }
      /**
       * Restore state before parse for calls after the first.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state restored.
       */
      restoreStateBeforeParse() {
        if (this._storeOptionsAsProperties)
          throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
        this._name = this._savedState._name;
        this._scriptPath = null;
        this.rawArgs = [];
        this._optionValues = { ...this._savedState._optionValues };
        this._optionValueSources = { ...this._savedState._optionValueSources };
        this.args = [];
        this.processedArgs = [];
      }
      /**
       * Throw if expected executable is missing. Add lots of help for author.
       *
       * @param {string} executableFile
       * @param {string} executableDir
       * @param {string} subcommandName
       */
      _checkForMissingExecutable(executableFile, executableDir, subcommandName) {
        if (fs5.existsSync(executableFile)) return;
        const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
        const executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
        throw new Error(executableMissing);
      }
      /**
       * Execute a sub-command executable.
       *
       * @private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = false;
        const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName) {
          const localBin = path4.resolve(baseDir, baseName);
          if (fs5.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path4.extname(baseName))) return void 0;
          const foundExt = sourceExt.find(
            (ext) => fs5.existsSync(`${localBin}${ext}`)
          );
          if (foundExt) return `${localBin}${foundExt}`;
          return void 0;
        }
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
        let executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs5.realpathSync(this._scriptPath);
          } catch {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path4.resolve(
            path4.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path4.basename(
              this._scriptPath,
              path4.extname(this._scriptPath)
            );
            if (legacyName !== this._name) {
              localFile = findFile(
                executableDir,
                `${legacyName}-${subcommand._name}`
              );
            }
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path4.extname(executableFile));
        let proc;
        if (process3.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process3.execArgv).concat(args);
            proc = childProcess.spawn(process3.argv[0], args, { stdio: "inherit" });
          } else {
            proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
          }
        } else {
          this._checkForMissingExecutable(
            executableFile,
            executableDir,
            subcommand._name
          );
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process3.execArgv).concat(args);
          proc = childProcess.spawn(process3.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process3.on(signal, () => {
              if (proc.killed === false && proc.exitCode === null) {
                proc.kill(signal);
              }
            });
          });
        }
        const exitCallback = this._exitCallback;
        proc.on("close", (code) => {
          code = code ?? 1;
          if (!exitCallback) {
            process3.exit(code);
          } else {
            exitCallback(
              new CommanderError2(
                code,
                "commander.executeSubCommandAsync",
                "(close)"
              )
            );
          }
        });
        proc.on("error", (err) => {
          if (err.code === "ENOENT") {
            this._checkForMissingExecutable(
              executableFile,
              executableDir,
              subcommand._name
            );
          } else if (err.code === "EACCES") {
            throw new Error(`'${executableFile}' not executable`);
          }
          if (!exitCallback) {
            process3.exit(1);
          } else {
            const wrappedError = new CommanderError2(
              1,
              "commander.executeSubCommandAsync",
              "(error)"
            );
            wrappedError.nestedError = err;
            exitCallback(wrappedError);
          }
        });
        this.runningCommand = proc;
      }
      /**
       * @private
       */
      _dispatchSubcommand(commandName, operands, unknown) {
        const subCommand = this._findCommand(commandName);
        if (!subCommand) this.help({ error: true });
        subCommand._prepareForParse();
        let promiseChain;
        promiseChain = this._chainOrCallSubCommandHook(
          promiseChain,
          subCommand,
          "preSubcommand"
        );
        promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler) {
            this._executeSubCommand(subCommand, operands.concat(unknown));
          } else {
            return subCommand._parseCommand(operands, unknown);
          }
        });
        return promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @private
       */
      _dispatchHelpCommand(subcommandName) {
        if (!subcommandName) {
          this.help();
        }
        const subCommand = this._findCommand(subcommandName);
        if (subCommand && !subCommand._executableHandler) {
          subCommand.help();
        }
        return this._dispatchSubcommand(
          subcommandName,
          [],
          [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
        );
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i) => {
          if (arg.required && this.args[i] == null) {
            this.missingArgument(arg.name());
          }
        });
        if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
          return;
        }
        if (this.args.length > this.registeredArguments.length) {
          this._excessArguments(this.args);
        }
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @private
       */
      _processArguments() {
        const myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(
              argument,
              value,
              previous,
              invalidValueMessage
            );
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value = this.args.slice(index);
              if (declaredArg.parseArg) {
                value = value.reduce((processed, v2) => {
                  return myParseArg(declaredArg, v2, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value === void 0) {
              value = [];
            }
          } else if (index < this.args.length) {
            value = this.args[index];
            if (declaredArg.parseArg) {
              value = myParseArg(declaredArg, value, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value;
        });
        this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {(Promise|undefined)} promise
       * @param {Function} fn
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCall(promise, fn) {
        if (promise?.then && typeof promise.then === "function") {
          return promise.then(() => fn());
        }
        return fn();
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise;
        const hooks = [];
        this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        });
        if (event === "postAction") {
          hooks.reverse();
        }
        hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => {
            return hookDetail.callback(hookDetail.hookedCommand, this);
          });
        });
        return result;
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        if (this._lifeCycleHooks[event] !== void 0) {
          this._lifeCycleHooks[event].forEach((hook) => {
            result = this._chainOrCall(result, () => {
              return hook(this, subCommand);
            });
          });
        }
        return result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @private
       */
      _parseCommand(operands, unknown) {
        const parsed = this.parseOptions(unknown);
        this._parseOptionsEnv();
        this._parseOptionsImplied();
        operands = operands.concat(parsed.operands);
        unknown = parsed.unknown;
        this.args = operands.concat(unknown);
        if (operands && this._findCommand(operands[0])) {
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        }
        if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
          return this._dispatchHelpCommand(operands[1]);
        }
        if (this._defaultCommandName) {
          this._outputHelpIfRequested(unknown);
          return this._dispatchSubcommand(
            this._defaultCommandName,
            operands,
            unknown
          );
        }
        if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
          this.help({ error: true });
        }
        this._outputHelpIfRequested(parsed.unknown);
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        const checkForUnknownOptions = () => {
          if (parsed.unknown.length > 0) {
            this.unknownOption(parsed.unknown[0]);
          }
        };
        const commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions();
          this._processArguments();
          let promiseChain;
          promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
          promiseChain = this._chainOrCall(
            promiseChain,
            () => this._actionHandler(this.processedArgs)
          );
          if (this.parent) {
            promiseChain = this._chainOrCall(promiseChain, () => {
              this.parent.emit(commandEvent, operands, unknown);
            });
          }
          promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
          return promiseChain;
        }
        if (this.parent?.listenerCount(commandEvent)) {
          checkForUnknownOptions();
          this._processArguments();
          this.parent.emit(commandEvent, operands, unknown);
        } else if (operands.length) {
          if (this._findCommand("*")) {
            return this._dispatchSubcommand("*", operands, unknown);
          }
          if (this.listenerCount("command:*")) {
            this.emit("command:*", operands, unknown);
          } else if (this.commands.length) {
            this.unknownCommand();
          } else {
            checkForUnknownOptions();
            this._processArguments();
          }
        } else if (this.commands.length) {
          checkForUnknownOptions();
          this.help({ error: true });
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      }
      /**
       * Find matching command.
       *
       * @private
       * @return {Command | undefined}
       */
      _findCommand(name) {
        if (!name) return void 0;
        return this.commands.find(
          (cmd) => cmd._name === name || cmd._aliases.includes(name)
        );
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @package
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
              cmd.missingMandatoryOptionValue(anOption);
            }
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @private
       */
      _checkForConflictingLocalOptions() {
        const definedNonDefaultOptions = this.options.filter((option) => {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === void 0) {
            return false;
          }
          return this.getOptionValueSource(optionKey) !== "default";
        });
        const optionsWithConflicting = definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        );
        optionsWithConflicting.forEach((option) => {
          const conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          if (conflictingAndDefined) {
            this._conflictingOption(option, conflictingAndDefined);
          }
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Side effects: modifies command by storing options. Does not reset state if called again.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {string[]} args
       * @return {{operands: string[], unknown: string[]}}
       */
      parseOptions(args) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        const negativeNumberArg = (arg) => {
          if (!/^-(\d+|\d*\.\d+)(e[+-]?\d+)?$/.test(arg)) return false;
          return !this._getCommandAndAncestors().some(
            (cmd) => cmd.options.map((opt) => opt.short).some((short) => /^-\d$/.test(short))
          );
        };
        let activeVariadicOption = null;
        let activeGroup = null;
        let i = 0;
        while (i < args.length || activeGroup) {
          const arg = activeGroup ?? args[i++];
          activeGroup = null;
          if (arg === "--") {
            if (dest === unknown) dest.push(arg);
            dest.push(...args.slice(i));
            break;
          }
          if (activeVariadicOption && (!maybeOption(arg) || negativeNumberArg(arg))) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value = args[i++];
                if (value === void 0) this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                if (i < args.length && (!maybeOption(args[i]) || negativeNumberArg(args[i]))) {
                  value = args[i++];
                }
                this.emit(`option:${option.name()}`, value);
              } else {
                this.emit(`option:${option.name()}`);
              }
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            const option = this._findOption(`-${arg[1]}`);
            if (option) {
              if (option.required || option.optional && this._combineFlagAndOptionalValue) {
                this.emit(`option:${option.name()}`, arg.slice(2));
              } else {
                this.emit(`option:${option.name()}`);
                activeGroup = `-${arg.slice(2)}`;
              }
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            const index = arg.indexOf("=");
            const option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (dest === operands && maybeOption(arg) && !(this.commands.length === 0 && negativeNumberArg(arg))) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              unknown.push(...args.slice(i));
              break;
            } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
              operands.push(arg, ...args.slice(i));
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg, ...args.slice(i));
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg, ...args.slice(i));
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          const result = {};
          const len = this.options.length;
          for (let i = 0; i < len; i++) {
            const key = this.options[i].attributeName();
            result[key] = key === this._versionOptionName ? this._version : this[key];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(
          `${message}
`,
          this._outputConfiguration.writeErr
        );
        if (typeof this._showHelpAfterError === "string") {
          this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
        } else if (this._showHelpAfterError) {
          this._outputConfiguration.writeErr("\n");
          this.outputHelp({ error: true });
        }
        const config = errorOptions || {};
        const exitCode = config.exitCode || 1;
        const code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process3.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
              this.getOptionValueSource(optionKey)
            )) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process3.env[option.envVar]);
              } else {
                this.emit(`optionEnv:${option.name()}`);
              }
            }
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @private
       */
      _parseOptionsImplied() {
        const dualHelper = new DualOptions(this.options);
        const hasCustomOptionValue = (optionKey) => {
          return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        };
        this.options.filter(
          (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option
          )
        ).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              "implied"
            );
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @private
       */
      missingArgument(name) {
        const message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @private
       */
      optionMissingArgument(option) {
        const message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @private
       */
      missingMandatoryOptionValue(option) {
        const message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @private
       */
      _conflictingOption(option, conflictingOption) {
        const findBestOptionFromValue = (option2) => {
          const optionKey = option2.attributeName();
          const optionValue = this.getOptionValue(optionKey);
          const negativeOption = this.options.find(
            (target) => target.negate && optionKey === target.attributeName()
          );
          const positiveOption = this.options.find(
            (target) => !target.negate && optionKey === target.attributeName()
          );
          if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
            return negativeOption;
          }
          return positiveOption || option2;
        };
        const getErrorMessage = (option2) => {
          const bestOption = findBestOptionFromValue(option2);
          const optionKey = bestOption.attributeName();
          const source = this.getOptionValueSource(optionKey);
          if (source === "env") {
            return `environment variable '${bestOption.envVar}'`;
          }
          return `option '${bestOption.flags}'`;
        };
        const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption) return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [];
          let command = this;
          do {
            const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags);
            command = command.parent;
          } while (command && !command._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        const message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments) return;
        const expected = this.registeredArguments.length;
        const s = expected === 1 ? "" : "s";
        const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
        const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @private
       */
      unknownCommand() {
        const unknownName = this.args[0];
        let suggestion = "";
        if (this._showSuggestionAfterError) {
          const candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command) => {
            candidateNames.push(command.name());
            if (command.alias()) candidateNames.push(command.alias());
          });
          suggestion = suggestSimilar(unknownName, candidateNames);
        }
        const message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
       */
      version(str, flags, description) {
        if (str === void 0) return this._version;
        this._version = str;
        flags = flags || "-V, --version";
        description = description || "output the version number";
        const versionOption = this.createOption(flags, description);
        this._versionOptionName = versionOption.attributeName();
        this._registerOption(versionOption);
        this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str}
`);
          this._exit(0, "commander.version", str);
        });
        return this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {object} [argsDescription]
       * @return {(string|Command)}
       */
      description(str, argsDescription) {
        if (str === void 0 && argsDescription === void 0)
          return this._description;
        this._description = str;
        if (argsDescription) {
          this._argsDescription = argsDescription;
        }
        return this;
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      summary(str) {
        if (str === void 0) return this._summary;
        this._summary = str;
        return this;
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {(string|Command)}
       */
      alias(alias) {
        if (alias === void 0) return this._aliases[0];
        let command = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
          command = this.commands[this.commands.length - 1];
        }
        if (alias === command._name)
          throw new Error("Command alias can't be the same as its name");
        const matchingCommand = this.parent?._findCommand(alias);
        if (matchingCommand) {
          const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
          throw new Error(
            `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
          );
        }
        command._aliases.push(alias);
        return this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {(string[]|Command)}
       */
      aliases(aliases) {
        if (aliases === void 0) return this._aliases;
        aliases.forEach((alias) => this.alias(alias));
        return this;
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      usage(str) {
        if (str === void 0) {
          if (this._usage) return this._usage;
          const args = this.registeredArguments.map((arg) => {
            return humanReadableArgName(arg);
          });
          return [].concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        this._usage = str;
        return this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      name(str) {
        if (str === void 0) return this._name;
        this._name = str;
        return this;
      }
      /**
       * Set/get the help group heading for this subcommand in parent command's help.
       *
       * @param {string} [heading]
       * @return {Command | string}
       */
      helpGroup(heading) {
        if (heading === void 0) return this._helpGroupHeading ?? "";
        this._helpGroupHeading = heading;
        return this;
      }
      /**
       * Set/get the default help group heading for subcommands added to this command.
       * (This does not override a group set directly on the subcommand using .helpGroup().)
       *
       * @example
       * program.commandsGroup('Development Commands:);
       * program.command('watch')...
       * program.command('lint')...
       * ...
       *
       * @param {string} [heading]
       * @returns {Command | string}
       */
      commandsGroup(heading) {
        if (heading === void 0) return this._defaultCommandGroup ?? "";
        this._defaultCommandGroup = heading;
        return this;
      }
      /**
       * Set/get the default help group heading for options added to this command.
       * (This does not override a group set directly on the option using .helpGroup().)
       *
       * @example
       * program
       *   .optionsGroup('Development Options:')
       *   .option('-d, --debug', 'output extra debugging')
       *   .option('-p, --profile', 'output profiling information')
       *
       * @param {string} [heading]
       * @returns {Command | string}
       */
      optionsGroup(heading) {
        if (heading === void 0) return this._defaultOptionGroup ?? "";
        this._defaultOptionGroup = heading;
        return this;
      }
      /**
       * @param {Option} option
       * @private
       */
      _initOptionGroup(option) {
        if (this._defaultOptionGroup && !option.helpGroupHeading)
          option.helpGroup(this._defaultOptionGroup);
      }
      /**
       * @param {Command} cmd
       * @private
       */
      _initCommandGroup(cmd) {
        if (this._defaultCommandGroup && !cmd.helpGroup())
          cmd.helpGroup(this._defaultCommandGroup);
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        this._name = path4.basename(filename, path4.extname(filename));
        return this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {(string|null|Command)}
       */
      executableDir(path5) {
        if (path5 === void 0) return this._executableDir;
        this._executableDir = path5;
        return this;
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        const helper = this.createHelp();
        const context = this._getOutputContext(contextOptions);
        helper.prepareContext({
          error: context.error,
          helpWidth: context.helpWidth,
          outputHasColors: context.hasColors
        });
        const text = helper.formatHelp(this, helper);
        if (context.hasColors) return text;
        return this._outputConfiguration.stripColor(text);
      }
      /**
       * @typedef HelpContext
       * @type {object}
       * @property {boolean} error
       * @property {number} helpWidth
       * @property {boolean} hasColors
       * @property {function} write - includes stripColor if needed
       *
       * @returns {HelpContext}
       * @private
       */
      _getOutputContext(contextOptions) {
        contextOptions = contextOptions || {};
        const error = !!contextOptions.error;
        let baseWrite;
        let hasColors;
        let helpWidth;
        if (error) {
          baseWrite = (str) => this._outputConfiguration.writeErr(str);
          hasColors = this._outputConfiguration.getErrHasColors();
          helpWidth = this._outputConfiguration.getErrHelpWidth();
        } else {
          baseWrite = (str) => this._outputConfiguration.writeOut(str);
          hasColors = this._outputConfiguration.getOutHasColors();
          helpWidth = this._outputConfiguration.getOutHelpWidth();
        }
        const write = (str) => {
          if (!hasColors) str = this._outputConfiguration.stripColor(str);
          return baseWrite(str);
        };
        return { error, write, hasColors, helpWidth };
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        if (typeof contextOptions === "function") {
          deprecatedCallback = contextOptions;
          contextOptions = void 0;
        }
        const outputContext = this._getOutputContext(contextOptions);
        const eventContext = {
          error: outputContext.error,
          write: outputContext.write,
          command: this
        };
        this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", eventContext));
        this.emit("beforeHelp", eventContext);
        let helpInformation = this.helpInformation({ error: outputContext.error });
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        outputContext.write(helpInformation);
        if (this._getHelpOption()?.long) {
          this.emit(this._getHelpOption().long);
        }
        this.emit("afterHelp", eventContext);
        this._getCommandAndAncestors().forEach(
          (command) => command.emit("afterAllHelp", eventContext)
        );
      }
      /**
       * You can pass in flags and a description to customise the built-in help option.
       * Pass in false to disable the built-in help option.
       *
       * @example
       * program.helpOption('-?, --help' 'show help'); // customise
       * program.helpOption(false); // disable
       *
       * @param {(string | boolean)} flags
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        if (typeof flags === "boolean") {
          if (flags) {
            if (this._helpOption === null) this._helpOption = void 0;
            if (this._defaultOptionGroup) {
              this._initOptionGroup(this._getHelpOption());
            }
          } else {
            this._helpOption = null;
          }
          return this;
        }
        this._helpOption = this.createOption(
          flags ?? "-h, --help",
          description ?? "display help for command"
        );
        if (flags || description) this._initOptionGroup(this._helpOption);
        return this;
      }
      /**
       * Lazy create help option.
       * Returns null if has been disabled with .helpOption(false).
       *
       * @returns {(Option | null)} the help option
       * @package
       */
      _getHelpOption() {
        if (this._helpOption === void 0) {
          this.helpOption(void 0, void 0);
        }
        return this._helpOption;
      }
      /**
       * Supply your own option to use for the built-in help option.
       * This is an alternative to using helpOption() to customise the flags and description etc.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addHelpOption(option) {
        this._helpOption = option;
        this._initOptionGroup(option);
        return this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = Number(process3.exitCode ?? 0);
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * // Do a little typing to coordinate emit and listener for the help text events.
       * @typedef HelpTextEventContext
       * @type {object}
       * @property {boolean} error
       * @property {Command} command
       * @property {function} write
       */
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {(string | Function)} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text === "function") {
            helpStr = text({ error: context.error, command: context.command });
          } else {
            helpStr = text;
          }
          if (helpStr) {
            context.write(`${helpStr}
`);
          }
        });
        return this;
      }
      /**
       * Output help information if help flags specified
       *
       * @param {Array} args - array of options to search for help flags
       * @private
       */
      _outputHelpIfRequested(args) {
        const helpOption = this._getHelpOption();
        const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
        if (helpRequested) {
          this.outputHelp();
          this._exit(0, "commander.helpDisplayed", "(outputHelp)");
        }
      }
    };
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect")) {
          return arg;
        }
        let debugOption;
        let debugHost = "127.0.0.1";
        let debugPort = "9229";
        let match;
        if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
          debugOption = match[1];
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
          debugOption = match[1];
          if (/^\d+$/.test(match[3])) {
            debugPort = match[3];
          } else {
            debugHost = match[3];
          }
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
          debugOption = match[1];
          debugHost = match[3];
          debugPort = match[4];
        }
        if (debugOption && debugPort !== "0") {
          return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
        }
        return arg;
      });
    }
    function useColor() {
      if (process3.env.NO_COLOR || process3.env.FORCE_COLOR === "0" || process3.env.FORCE_COLOR === "false")
        return false;
      if (process3.env.FORCE_COLOR || process3.env.CLICOLOR_FORCE !== void 0)
        return true;
      return void 0;
    }
    exports.Command = Command2;
    exports.useColor = useColor;
  }
});

// node_modules/commander/index.js
var require_commander = __commonJS({
  "node_modules/commander/index.js"(exports) {
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports.program = new Command2();
    exports.createCommand = (name) => new Command2(name);
    exports.createOption = (flags, description) => new Option2(flags, description);
    exports.createArgument = (name, description) => new Argument2(name, description);
    exports.Command = Command2;
    exports.Option = Option2;
    exports.Argument = Argument2;
    exports.Help = Help2;
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
    exports.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// node_modules/sisteransi/src/index.js
var require_src = __commonJS({
  "node_modules/sisteransi/src/index.js"(exports, module) {
    "use strict";
    var ESC2 = "\x1B";
    var CSI2 = `${ESC2}[`;
    var beep = "\x07";
    var cursor = {
      to(x3, y) {
        if (!y) return `${CSI2}${x3 + 1}G`;
        return `${CSI2}${y + 1};${x3 + 1}H`;
      },
      move(x3, y) {
        let ret = "";
        if (x3 < 0) ret += `${CSI2}${-x3}D`;
        else if (x3 > 0) ret += `${CSI2}${x3}C`;
        if (y < 0) ret += `${CSI2}${-y}A`;
        else if (y > 0) ret += `${CSI2}${y}B`;
        return ret;
      },
      up: (count = 1) => `${CSI2}${count}A`,
      down: (count = 1) => `${CSI2}${count}B`,
      forward: (count = 1) => `${CSI2}${count}C`,
      backward: (count = 1) => `${CSI2}${count}D`,
      nextLine: (count = 1) => `${CSI2}E`.repeat(count),
      prevLine: (count = 1) => `${CSI2}F`.repeat(count),
      left: `${CSI2}G`,
      hide: `${CSI2}?25l`,
      show: `${CSI2}?25h`,
      save: `${ESC2}7`,
      restore: `${ESC2}8`
    };
    var scroll = {
      up: (count = 1) => `${CSI2}S`.repeat(count),
      down: (count = 1) => `${CSI2}T`.repeat(count)
    };
    var erase = {
      screen: `${CSI2}2J`,
      up: (count = 1) => `${CSI2}1J`.repeat(count),
      down: (count = 1) => `${CSI2}J`.repeat(count),
      line: `${CSI2}2K`,
      lineEnd: `${CSI2}K`,
      lineStart: `${CSI2}1K`,
      lines(count) {
        let clear = "";
        for (let i = 0; i < count; i++)
          clear += this.line + (i < count - 1 ? cursor.up() : "");
        if (count)
          clear += cursor.left;
        return clear;
      }
    };
    module.exports = { cursor, scroll, erase, beep };
  }
});

// src/hclaw/cli.ts
import fs4 from "node:fs/promises";
import { realpathSync } from "node:fs";
import process2 from "node:process";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

// node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// node_modules/@clack/core/dist/index.mjs
import { styleText as v } from "node:util";
import { stdout as x, stdin as D } from "node:process";
import E from "node:readline";

// node_modules/fast-string-truncated-width/dist/utils.js
var getCodePointsLength = /* @__PURE__ */ (() => {
  const SURROGATE_PAIR_RE = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
  return (input) => {
    let surrogatePairsNr = 0;
    SURROGATE_PAIR_RE.lastIndex = 0;
    while (SURROGATE_PAIR_RE.test(input)) {
      surrogatePairsNr += 1;
    }
    return input.length - surrogatePairsNr;
  };
})();
var isFullWidth = (x3) => {
  return x3 === 12288 || x3 >= 65281 && x3 <= 65376 || x3 >= 65504 && x3 <= 65510;
};
var isWideNotCJKTNotEmoji = (x3) => {
  return x3 === 8987 || x3 === 9001 || x3 >= 12272 && x3 <= 12287 || x3 >= 12289 && x3 <= 12350 || x3 >= 12441 && x3 <= 12543 || x3 >= 12549 && x3 <= 12591 || x3 >= 12593 && x3 <= 12686 || x3 >= 12688 && x3 <= 12771 || x3 >= 12783 && x3 <= 12830 || x3 >= 12832 && x3 <= 12871 || x3 >= 12880 && x3 <= 19903 || x3 >= 65040 && x3 <= 65049 || x3 >= 65072 && x3 <= 65106 || x3 >= 65108 && x3 <= 65126 || x3 >= 65128 && x3 <= 65131 || x3 >= 127488 && x3 <= 127490 || x3 >= 127504 && x3 <= 127547 || x3 >= 127552 && x3 <= 127560 || x3 >= 131072 && x3 <= 196605 || x3 >= 196608 && x3 <= 262141;
};

// node_modules/fast-string-truncated-width/dist/index.js
var ANSI_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|\u001b\]8;[^;]*;.*?(?:\u0007|\u001b\u005c)/y;
var CONTROL_RE = /[\x00-\x08\x0A-\x1F\x7F-\x9F]{1,1000}/y;
var CJKT_WIDE_RE = /(?:(?![\uFF61-\uFF9F\uFF00-\uFFEF])[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Tangut}]){1,1000}/yu;
var TAB_RE = /\t{1,1000}/y;
var EMOJI_RE = new RegExp("[\\u{1F1E6}-\\u{1F1FF}]{2}|\\u{1F3F4}[\\u{E0061}-\\u{E007A}]{2}[\\u{E0030}-\\u{E0039}\\u{E0061}-\\u{E007A}]{1,3}\\u{E007F}|(?:\\p{Emoji}\\uFE0F\\u20E3?|\\p{Emoji_Modifier_Base}\\p{Emoji_Modifier}?|\\p{Emoji_Presentation})(?:\\u200D(?:\\p{Emoji_Modifier_Base}\\p{Emoji_Modifier}?|\\p{Emoji_Presentation}|\\p{Emoji}\\uFE0F\\u20E3?))*", "yu");
var LATIN_RE = /(?:[\x20-\x7E\xA0-\xFF](?!\uFE0F)){1,1000}/y;
var MODIFIER_RE = new RegExp("\\p{M}+", "gu");
var NO_TRUNCATION = { limit: Infinity, ellipsis: "" };
var getStringTruncatedWidth = (input, truncationOptions = {}, widthOptions = {}) => {
  const LIMIT = truncationOptions.limit ?? Infinity;
  const ELLIPSIS = truncationOptions.ellipsis ?? "";
  const ELLIPSIS_WIDTH = truncationOptions?.ellipsisWidth ?? (ELLIPSIS ? getStringTruncatedWidth(ELLIPSIS, NO_TRUNCATION, widthOptions).width : 0);
  const ANSI_WIDTH = 0;
  const CONTROL_WIDTH = widthOptions.controlWidth ?? 0;
  const TAB_WIDTH = widthOptions.tabWidth ?? 8;
  const EMOJI_WIDTH = widthOptions.emojiWidth ?? 2;
  const FULL_WIDTH_WIDTH = 2;
  const REGULAR_WIDTH = widthOptions.regularWidth ?? 1;
  const WIDE_WIDTH = widthOptions.wideWidth ?? FULL_WIDTH_WIDTH;
  const PARSE_BLOCKS = [
    [LATIN_RE, REGULAR_WIDTH],
    [ANSI_RE, ANSI_WIDTH],
    [CONTROL_RE, CONTROL_WIDTH],
    [TAB_RE, TAB_WIDTH],
    [EMOJI_RE, EMOJI_WIDTH],
    [CJKT_WIDE_RE, WIDE_WIDTH]
  ];
  let indexPrev = 0;
  let index = 0;
  let length = input.length;
  let lengthExtra = 0;
  let truncationEnabled = false;
  let truncationIndex = length;
  let truncationLimit = Math.max(0, LIMIT - ELLIPSIS_WIDTH);
  let unmatchedStart = 0;
  let unmatchedEnd = 0;
  let width = 0;
  let widthExtra = 0;
  outer: while (true) {
    if (unmatchedEnd > unmatchedStart || index >= length && index > indexPrev) {
      const unmatched = input.slice(unmatchedStart, unmatchedEnd) || input.slice(indexPrev, index);
      lengthExtra = 0;
      for (const char of unmatched.replaceAll(MODIFIER_RE, "")) {
        const codePoint = char.codePointAt(0) || 0;
        if (isFullWidth(codePoint)) {
          widthExtra = FULL_WIDTH_WIDTH;
        } else if (isWideNotCJKTNotEmoji(codePoint)) {
          widthExtra = WIDE_WIDTH;
        } else {
          widthExtra = REGULAR_WIDTH;
        }
        if (width + widthExtra > truncationLimit) {
          truncationIndex = Math.min(truncationIndex, Math.max(unmatchedStart, indexPrev) + lengthExtra);
        }
        if (width + widthExtra > LIMIT) {
          truncationEnabled = true;
          break outer;
        }
        lengthExtra += char.length;
        width += widthExtra;
      }
      unmatchedStart = unmatchedEnd = 0;
    }
    if (index >= length) {
      break outer;
    }
    for (let i = 0, l = PARSE_BLOCKS.length; i < l; i++) {
      const [BLOCK_RE, BLOCK_WIDTH] = PARSE_BLOCKS[i];
      BLOCK_RE.lastIndex = index;
      if (BLOCK_RE.test(input)) {
        lengthExtra = BLOCK_RE === CJKT_WIDE_RE ? getCodePointsLength(input.slice(index, BLOCK_RE.lastIndex)) : BLOCK_RE === EMOJI_RE ? 1 : BLOCK_RE.lastIndex - index;
        widthExtra = lengthExtra * BLOCK_WIDTH;
        if (width + widthExtra > truncationLimit) {
          truncationIndex = Math.min(truncationIndex, index + Math.floor((truncationLimit - width) / BLOCK_WIDTH));
        }
        if (width + widthExtra > LIMIT) {
          truncationEnabled = true;
          break outer;
        }
        width += widthExtra;
        unmatchedStart = indexPrev;
        unmatchedEnd = index;
        index = indexPrev = BLOCK_RE.lastIndex;
        continue outer;
      }
    }
    index += 1;
  }
  return {
    width: truncationEnabled ? truncationLimit : width,
    index: truncationEnabled ? truncationIndex : length,
    truncated: truncationEnabled,
    ellipsed: truncationEnabled && LIMIT >= ELLIPSIS_WIDTH
  };
};
var dist_default = getStringTruncatedWidth;

// node_modules/fast-string-width/dist/index.js
var NO_TRUNCATION2 = {
  limit: Infinity,
  ellipsis: "",
  ellipsisWidth: 0
};
var fastStringWidth = (input, options = {}) => {
  return dist_default(input, NO_TRUNCATION2, options).width;
};
var dist_default2 = fastStringWidth;

// node_modules/fast-wrap-ansi/lib/main.js
var ESC = "\x1B";
var CSI = "\x9B";
var END_CODE = 39;
var ANSI_ESCAPE_BELL = "\x07";
var ANSI_CSI = "[";
var ANSI_OSC = "]";
var ANSI_SGR_TERMINATOR = "m";
var ANSI_ESCAPE_LINK = `${ANSI_OSC}8;;`;
var GROUP_REGEX = new RegExp(`(?:\\${ANSI_CSI}(?<code>\\d+)m|\\${ANSI_ESCAPE_LINK}(?<uri>.*)${ANSI_ESCAPE_BELL})`, "y");
var getClosingCode = (openingCode) => {
  if (openingCode >= 30 && openingCode <= 37)
    return 39;
  if (openingCode >= 90 && openingCode <= 97)
    return 39;
  if (openingCode >= 40 && openingCode <= 47)
    return 49;
  if (openingCode >= 100 && openingCode <= 107)
    return 49;
  if (openingCode === 1 || openingCode === 2)
    return 22;
  if (openingCode === 3)
    return 23;
  if (openingCode === 4)
    return 24;
  if (openingCode === 7)
    return 27;
  if (openingCode === 8)
    return 28;
  if (openingCode === 9)
    return 29;
  if (openingCode === 0)
    return 0;
  return void 0;
};
var wrapAnsiCode = (code) => `${ESC}${ANSI_CSI}${code}${ANSI_SGR_TERMINATOR}`;
var wrapAnsiHyperlink = (url) => `${ESC}${ANSI_ESCAPE_LINK}${url}${ANSI_ESCAPE_BELL}`;
var wrapWord = (rows, word, columns) => {
  const characters = word[Symbol.iterator]();
  let isInsideEscape = false;
  let isInsideLinkEscape = false;
  let lastRow = rows.at(-1);
  let visible = lastRow === void 0 ? 0 : dist_default2(lastRow);
  let currentCharacter = characters.next();
  let nextCharacter = characters.next();
  let rawCharacterIndex = 0;
  while (!currentCharacter.done) {
    const character = currentCharacter.value;
    const characterLength = dist_default2(character);
    if (visible + characterLength <= columns) {
      rows[rows.length - 1] += character;
    } else {
      rows.push(character);
      visible = 0;
    }
    if (character === ESC || character === CSI) {
      isInsideEscape = true;
      isInsideLinkEscape = word.startsWith(ANSI_ESCAPE_LINK, rawCharacterIndex + 1);
    }
    if (isInsideEscape) {
      if (isInsideLinkEscape) {
        if (character === ANSI_ESCAPE_BELL) {
          isInsideEscape = false;
          isInsideLinkEscape = false;
        }
      } else if (character === ANSI_SGR_TERMINATOR) {
        isInsideEscape = false;
      }
    } else {
      visible += characterLength;
      if (visible === columns && !nextCharacter.done) {
        rows.push("");
        visible = 0;
      }
    }
    currentCharacter = nextCharacter;
    nextCharacter = characters.next();
    rawCharacterIndex += character.length;
  }
  lastRow = rows.at(-1);
  if (!visible && lastRow !== void 0 && lastRow.length && rows.length > 1) {
    rows[rows.length - 2] += rows.pop();
  }
};
var stringVisibleTrimSpacesRight = (string) => {
  const words = string.split(" ");
  let last = words.length;
  while (last) {
    if (dist_default2(words[last - 1])) {
      break;
    }
    last--;
  }
  if (last === words.length) {
    return string;
  }
  return words.slice(0, last).join(" ") + words.slice(last).join("");
};
var exec = (string, columns, options = {}) => {
  if (options.trim !== false && string.trim() === "") {
    return "";
  }
  let returnValue = "";
  let escapeCode;
  let escapeUrl;
  const words = string.split(" ");
  let rows = [""];
  let rowLength = 0;
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    if (options.trim !== false) {
      const row = rows.at(-1) ?? "";
      const trimmed = row.trimStart();
      if (row.length !== trimmed.length) {
        rows[rows.length - 1] = trimmed;
        rowLength = dist_default2(trimmed);
      }
    }
    if (index !== 0) {
      if (rowLength >= columns && (options.wordWrap === false || options.trim === false)) {
        rows.push("");
        rowLength = 0;
      }
      if (rowLength || options.trim === false) {
        rows[rows.length - 1] += " ";
        rowLength++;
      }
    }
    const wordLength = dist_default2(word);
    if (options.hard && wordLength > columns) {
      const remainingColumns = columns - rowLength;
      const breaksStartingThisLine = 1 + Math.floor((wordLength - remainingColumns - 1) / columns);
      const breaksStartingNextLine = Math.floor((wordLength - 1) / columns);
      if (breaksStartingNextLine < breaksStartingThisLine) {
        rows.push("");
      }
      wrapWord(rows, word, columns);
      rowLength = dist_default2(rows.at(-1) ?? "");
      continue;
    }
    if (rowLength + wordLength > columns && rowLength && wordLength) {
      if (options.wordWrap === false && rowLength < columns) {
        wrapWord(rows, word, columns);
        rowLength = dist_default2(rows.at(-1) ?? "");
        continue;
      }
      rows.push("");
      rowLength = 0;
    }
    if (rowLength + wordLength > columns && options.wordWrap === false) {
      wrapWord(rows, word, columns);
      rowLength = dist_default2(rows.at(-1) ?? "");
      continue;
    }
    rows[rows.length - 1] += word;
    rowLength += wordLength;
  }
  if (options.trim !== false) {
    rows = rows.map((row) => stringVisibleTrimSpacesRight(row));
  }
  const preString = rows.join("\n");
  let inSurrogate = false;
  for (let i = 0; i < preString.length; i++) {
    const character = preString[i];
    returnValue += character;
    if (!inSurrogate) {
      inSurrogate = character >= "\uD800" && character <= "\uDBFF";
      if (inSurrogate) {
        continue;
      }
    } else {
      inSurrogate = false;
    }
    if (character === ESC || character === CSI) {
      GROUP_REGEX.lastIndex = i + 1;
      const groupsResult = GROUP_REGEX.exec(preString);
      const groups = groupsResult?.groups;
      if (groups?.code !== void 0) {
        const code = Number.parseFloat(groups.code);
        escapeCode = code === END_CODE ? void 0 : code;
      } else if (groups?.uri !== void 0) {
        escapeUrl = groups.uri.length === 0 ? void 0 : groups.uri;
      }
    }
    if (preString[i + 1] === "\n") {
      if (escapeUrl) {
        returnValue += wrapAnsiHyperlink("");
      }
      const closingCode = escapeCode ? getClosingCode(escapeCode) : void 0;
      if (escapeCode && closingCode) {
        returnValue += wrapAnsiCode(closingCode);
      }
    } else if (character === "\n") {
      if (escapeCode && getClosingCode(escapeCode)) {
        returnValue += wrapAnsiCode(escapeCode);
      }
      if (escapeUrl) {
        returnValue += wrapAnsiHyperlink(escapeUrl);
      }
    }
  }
  return returnValue;
};
var CRLF_OR_LF = /\r?\n/;
function wrapAnsi(string, columns, options) {
  return String(string).normalize().split(CRLF_OR_LF).map((line) => exec(line, columns, options)).join("\n");
}

// node_modules/@clack/core/dist/index.mjs
var import_sisteransi = __toESM(require_src(), 1);
var G = ["up", "down", "left", "right", "space", "enter", "cancel"];
var K = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var h = { actions: new Set(G), aliases: /* @__PURE__ */ new Map([["k", "up"], ["j", "down"], ["h", "left"], ["l", "right"], ["", "cancel"], ["escape", "cancel"]]), messages: { cancel: "Canceled", error: "Something went wrong" }, withGuide: true, date: { monthNames: [...K], messages: { required: "Please enter a valid date", invalidMonth: "There are only 12 months in a year", invalidDay: (r, t) => `There are only ${r} days in ${t}`, afterMin: (r) => `Date must be on or after ${r.toISOString().slice(0, 10)}`, beforeMax: (r) => `Date must be on or before ${r.toISOString().slice(0, 10)}` } } };
function C(r, t) {
  if (typeof r == "string") return h.aliases.get(r) === t;
  for (const s of r) if (s !== void 0 && C(s, t)) return true;
  return false;
}
function z(r, t) {
  if (r === t) return;
  const s = r.split(`
`), e2 = t.split(`
`), i = Math.max(s.length, e2.length), n = [];
  for (let o = 0; o < i; o++) s[o] !== e2[o] && n.push(o);
  return { lines: n, numLinesBefore: s.length, numLinesAfter: e2.length, numLines: i };
}
var Y = globalThis.process.platform.startsWith("win");
var k = Symbol("clack:cancel");
function q(r) {
  return r === k;
}
function w(r, t) {
  const s = r;
  s.isTTY && s.setRawMode(t);
}
var A = (r) => "columns" in r && typeof r.columns == "number" ? r.columns : 80;
var L = (r) => "rows" in r && typeof r.rows == "number" ? r.rows : 20;
function W(r, t, s, e2 = s, i = s, n) {
  const o = A(r ?? x);
  return wrapAnsi(t, o - s.length, { hard: true, trim: false }).split(`
`).map((u, a, l) => {
    const c = n ? n(u, a) : u;
    return a === 0 ? `${e2}${c}` : a === l.length - 1 ? `${i}${c}` : `${s}${c}`;
  }).join(`
`);
}
var m = class {
  input;
  output;
  _abortSignal;
  rl;
  opts;
  _render;
  _track = false;
  _prevFrame = "";
  _subscribers = /* @__PURE__ */ new Map();
  _cursor = 0;
  state = "initial";
  error = "";
  value;
  userInput = "";
  constructor(t, s = true) {
    const { input: e2 = D, output: i = x, render: n, signal: o, ...u } = t;
    this.opts = u, this.onKeypress = this.onKeypress.bind(this), this.close = this.close.bind(this), this.render = this.render.bind(this), this._render = n.bind(this), this._track = s, this._abortSignal = o, this.input = e2, this.output = i;
  }
  unsubscribe() {
    this._subscribers.clear();
  }
  setSubscriber(t, s) {
    const e2 = this._subscribers.get(t) ?? [];
    e2.push(s), this._subscribers.set(t, e2);
  }
  on(t, s) {
    this.setSubscriber(t, { cb: s });
  }
  once(t, s) {
    this.setSubscriber(t, { cb: s, once: true });
  }
  emit(t, ...s) {
    const e2 = this._subscribers.get(t) ?? [], i = [];
    for (const n of e2) n.cb(...s), n.once && i.push(() => e2.splice(e2.indexOf(n), 1));
    for (const n of i) n();
  }
  prompt() {
    return new Promise((t) => {
      if (this._abortSignal) {
        if (this._abortSignal.aborted) return this.state = "cancel", this.close(), t(k);
        this._abortSignal.addEventListener("abort", () => {
          this.state = "cancel", this.close();
        }, { once: true });
      }
      this.rl = E.createInterface({ input: this.input, tabSize: 2, prompt: "", escapeCodeTimeout: 50, terminal: true }), this.rl.prompt(), this.opts.initialUserInput !== void 0 && this._setUserInput(this.opts.initialUserInput, true), this.input.on("keypress", this.onKeypress), w(this.input, true), this.output.on("resize", this.render), this.render(), this.once("submit", () => {
        this.output.write(import_sisteransi.cursor.show), this.output.off("resize", this.render), w(this.input, false), t(this.value);
      }), this.once("cancel", () => {
        this.output.write(import_sisteransi.cursor.show), this.output.off("resize", this.render), w(this.input, false), t(k);
      });
    });
  }
  _isActionKey(t, s) {
    return t === "	";
  }
  _shouldSubmit(t, s) {
    return true;
  }
  _setValue(t) {
    this.value = t, this.emit("value", this.value);
  }
  _setUserInput(t, s) {
    this.userInput = t ?? "", this.emit("userInput", this.userInput), s && this._track && this.rl && (this.rl.write(this.userInput), this._cursor = this.rl.cursor);
  }
  _clearUserInput() {
    this.rl?.write(null, { ctrl: true, name: "u" }), this._setUserInput("");
  }
  onKeypress(t, s) {
    if (this._track && s.name !== "return" && (s.name && this._isActionKey(t, s) && this.rl?.write(null, { ctrl: true, name: "h" }), this._cursor = this.rl?.cursor ?? 0, this._setUserInput(this.rl?.line)), this.state === "error" && (this.state = "active"), s?.name && (!this._track && h.aliases.has(s.name) && this.emit("cursor", h.aliases.get(s.name)), h.actions.has(s.name) && this.emit("cursor", s.name)), t && (t.toLowerCase() === "y" || t.toLowerCase() === "n") && this.emit("confirm", t.toLowerCase() === "y"), this.emit("key", t?.toLowerCase(), s), s?.name === "return" && this._shouldSubmit(t, s)) {
      if (this.opts.validate) {
        const e2 = this.opts.validate(this.value);
        e2 && (this.error = e2 instanceof Error ? e2.message : e2, this.state = "error", this.rl?.write(this.userInput));
      }
      this.state !== "error" && (this.state = "submit");
    }
    C([t, s?.name, s?.sequence], "cancel") && (this.state = "cancel"), (this.state === "submit" || this.state === "cancel") && this.emit("finalize"), this.render(), (this.state === "submit" || this.state === "cancel") && this.close();
  }
  close() {
    this.input.unpipe(), this.input.removeListener("keypress", this.onKeypress), this.output.write(`
`), w(this.input, false), this.rl?.close(), this.rl = void 0, this.emit(`${this.state}`, this.value), this.unsubscribe();
  }
  restoreCursor() {
    const t = wrapAnsi(this._prevFrame, process.stdout.columns, { hard: true, trim: false }).split(`
`).length - 1;
    this.output.write(import_sisteransi.cursor.move(-999, t * -1));
  }
  render() {
    const t = wrapAnsi(this._render(this) ?? "", process.stdout.columns, { hard: true, trim: false });
    if (t !== this._prevFrame) {
      if (this.state === "initial") this.output.write(import_sisteransi.cursor.hide);
      else {
        const s = z(this._prevFrame, t), e2 = L(this.output);
        if (this.restoreCursor(), s) {
          const i = Math.max(0, s.numLinesAfter - e2), n = Math.max(0, s.numLinesBefore - e2);
          let o = s.lines.find((u) => u >= i);
          if (o === void 0) {
            this._prevFrame = t;
            return;
          }
          if (s.lines.length === 1) {
            this.output.write(import_sisteransi.cursor.move(0, o - n)), this.output.write(import_sisteransi.erase.lines(1));
            const u = t.split(`
`);
            this.output.write(u[o]), this._prevFrame = t, this.output.write(import_sisteransi.cursor.move(0, u.length - o - 1));
            return;
          } else if (s.lines.length > 1) {
            if (i < n) o = i;
            else {
              const a = o - n;
              a > 0 && this.output.write(import_sisteransi.cursor.move(0, a));
            }
            this.output.write(import_sisteransi.erase.down());
            const u = t.split(`
`).slice(o);
            this.output.write(u.join(`
`)), this._prevFrame = t;
            return;
          }
        }
        this.output.write(import_sisteransi.erase.down());
      }
      this.output.write(t), this.state === "initial" && (this.state = "active"), this._prevFrame = t;
    }
  }
};
var X = class extends m {
  get cursor() {
    return this.value ? 0 : 1;
  }
  get _value() {
    return this.cursor === 0;
  }
  constructor(t) {
    super(t, false), this.value = !!t.initialValue, this.on("userInput", () => {
      this.value = this._value;
    }), this.on("confirm", (s) => {
      this.output.write(import_sisteransi.cursor.move(0, -1)), this.value = s, this.state = "submit", this.close();
    }), this.on("cursor", () => {
      this.value = !this.value;
    });
  }
};
var ot = class extends m {
  _mask = "\u2022";
  get cursor() {
    return this._cursor;
  }
  get masked() {
    return this.userInput.replaceAll(/./g, this._mask);
  }
  get userInputWithCursor() {
    if (this.state === "submit" || this.state === "cancel") return this.masked;
    const t = this.userInput;
    if (this.cursor >= t.length) return `${this.masked}${v(["inverse", "hidden"], "_")}`;
    const s = this.masked, e2 = s.slice(0, this.cursor), i = s.slice(this.cursor);
    return `${e2}${v("inverse", i[0])}${i.slice(1)}`;
  }
  clear() {
    this._clearUserInput();
  }
  constructor({ mask: t, ...s }) {
    super(s), this._mask = t ?? "\u2022", this.on("userInput", (e2) => {
      this._setValue(e2);
    });
  }
};
var ht = class extends m {
  get userInputWithCursor() {
    if (this.state === "submit") return this.userInput;
    const t = this.userInput;
    if (this.cursor >= t.length) return `${this.userInput}\u2588`;
    const s = t.slice(0, this.cursor), [e2, ...i] = t.slice(this.cursor);
    return `${s}${v("inverse", e2)}${i.join("")}`;
  }
  get cursor() {
    return this._cursor;
  }
  constructor(t) {
    super({ ...t, initialUserInput: t.initialUserInput ?? t.initialValue }), this.on("userInput", (s) => {
      this._setValue(s);
    }), this.on("finalize", () => {
      this.value || (this.value = t.defaultValue), this.value === void 0 && (this.value = "");
    });
  }
};

// node_modules/@clack/prompts/dist/index.mjs
import { styleText as e, stripVTControlCharacters as nt2 } from "node:util";
import V2 from "node:process";
var import_sisteransi2 = __toESM(require_src(), 1);
function ee() {
  return V2.platform !== "win32" ? V2.env.TERM !== "linux" : !!V2.env.CI || !!V2.env.WT_SESSION || !!V2.env.TERMINUS_SUBLIME || V2.env.ConEmuTask === "{cmd::Cmder}" || V2.env.TERM_PROGRAM === "Terminus-Sublime" || V2.env.TERM_PROGRAM === "vscode" || V2.env.TERM === "xterm-256color" || V2.env.TERM === "alacritty" || V2.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
var tt = ee();
var w2 = (t, i) => tt ? t : i;
var Tt = w2("\u25C6", "*");
var at2 = w2("\u25A0", "x");
var ut2 = w2("\u25B2", "x");
var H = w2("\u25C7", "o");
var lt = w2("\u250C", "T");
var $ = w2("\u2502", "|");
var x2 = w2("\u2514", "\u2014");
var _t = w2("\u2510", "T");
var xt = w2("\u2518", "\u2014");
var z2 = w2("\u25CF", ">");
var U = w2("\u25CB", " ");
var et2 = w2("\u25FB", "[\u2022]");
var K2 = w2("\u25FC", "[+]");
var Y2 = w2("\u25FB", "[ ]");
var Et = w2("\u25AA", "\u2022");
var st = w2("\u2500", "-");
var ct = w2("\u256E", "+");
var Gt = w2("\u251C", "+");
var $t = w2("\u256F", "+");
var dt = w2("\u2570", "+");
var Mt = w2("\u256D", "+");
var ht2 = w2("\u25CF", "\u2022");
var pt = w2("\u25C6", "*");
var mt = w2("\u25B2", "!");
var gt = w2("\u25A0", "x");
var P = (t) => {
  switch (t) {
    case "initial":
    case "active":
      return e("cyan", Tt);
    case "cancel":
      return e("red", at2);
    case "error":
      return e("yellow", ut2);
    case "submit":
      return e("green", H);
  }
};
var ue = (t) => {
  const i = t.active ?? "Yes", s = t.inactive ?? "No";
  return new X({ active: i, inactive: s, signal: t.signal, input: t.input, output: t.output, initialValue: t.initialValue ?? true, render() {
    const r = t.withGuide ?? h.withGuide, u = `${P(this.state)}  `, n = r ? `${e("gray", $)}  ` : "", a = W(t.output, t.message, n, u), c = `${r ? `${e("gray", $)}
` : ""}${a}
`, o = this.value ? i : s;
    switch (this.state) {
      case "submit": {
        const l = r ? `${e("gray", $)}  ` : "";
        return `${c}${l}${e("dim", o)}`;
      }
      case "cancel": {
        const l = r ? `${e("gray", $)}  ` : "";
        return `${c}${l}${e(["strikethrough", "dim"], o)}${r ? `
${e("gray", $)}` : ""}`;
      }
      default: {
        const l = r ? `${e("cyan", $)}  ` : "", d = r ? e("cyan", x2) : "";
        return `${c}${l}${this.value ? `${e("green", z2)} ${i}` : `${e("dim", U)} ${e("dim", i)}`}${t.vertical ? r ? `
${e("cyan", $)}  ` : `
` : ` ${e("dim", "/")} `}${this.value ? `${e("dim", U)} ${e("dim", s)}` : `${e("green", z2)} ${s}`}
${d}
`;
      }
    }
  } }).prompt();
};
var me = (t = "", i) => {
  const s = i?.output ?? process.stdout, r = i?.withGuide ?? h.withGuide ? `${e("gray", x2)}  ` : "";
  s.write(`${r}${e("red", t)}

`);
};
var ge = (t = "", i) => {
  const s = i?.output ?? process.stdout, r = i?.withGuide ?? h.withGuide ? `${e("gray", lt)}  ` : "";
  s.write(`${r}${t}
`);
};
var ye = (t = "", i) => {
  const s = i?.output ?? process.stdout, r = i?.withGuide ?? h.withGuide ? `${e("gray", $)}
${e("gray", x2)}  ` : "";
  s.write(`${r}${t}

`);
};
var we = (t) => e("dim", t);
var be = (t, i, s) => {
  const r = { hard: true, trim: false }, u = wrapAnsi(t, i, r).split(`
`), n = u.reduce((o, l) => Math.max(dist_default2(l), o), 0), a = u.map(s).reduce((o, l) => Math.max(dist_default2(l), o), 0), c = i - (a - n);
  return wrapAnsi(t, c, r);
};
var Se = (t = "", i = "", s) => {
  const r = s?.output ?? V2.stdout, u = s?.withGuide ?? h.withGuide, n = s?.format ?? we, a = ["", ...be(t, A(r) - 6, n).split(`
`).map(n), ""], c = dist_default2(i), o = Math.max(a.reduce((p2, f) => {
    const h2 = dist_default2(f);
    return h2 > p2 ? h2 : p2;
  }, 0), c) + 2, l = a.map((p2) => `${e("gray", $)}  ${p2}${" ".repeat(o - dist_default2(p2))}${e("gray", $)}`).join(`
`), d = u ? `${e("gray", $)}
` : "", g = u ? Gt : dt;
  r.write(`${d}${e("green", H)}  ${e("reset", i)} ${e("gray", st.repeat(Math.max(o - c - 1, 1)) + ct)}
${l}
${e("gray", g + st.repeat(o + 2) + $t)}
`);
};
var Ce = (t) => new ot({ validate: t.validate, mask: t.mask ?? Et, signal: t.signal, input: t.input, output: t.output, render() {
  const i = t.withGuide ?? h.withGuide, s = `${i ? `${e("gray", $)}
` : ""}${P(this.state)}  ${t.message}
`, r = this.userInputWithCursor, u = this.masked;
  switch (this.state) {
    case "error": {
      const n = i ? `${e("yellow", $)}  ` : "", a = i ? `${e("yellow", x2)}  ` : "", c = u ?? "";
      return t.clearOnError && this.clear(), `${s.trim()}
${n}${c}
${a}${e("yellow", this.error)}
`;
    }
    case "submit": {
      const n = i ? `${e("gray", $)}  ` : "", a = u ? e("dim", u) : "";
      return `${s}${n}${a}`;
    }
    case "cancel": {
      const n = i ? `${e("gray", $)}  ` : "", a = u ? e(["strikethrough", "dim"], u) : "";
      return `${s}${n}${a}${u && i ? `
${e("gray", $)}` : ""}`;
    }
    default: {
      const n = i ? `${e("cyan", $)}  ` : "", a = i ? e("cyan", x2) : "";
      return `${s}${n}${r}
${a}
`;
    }
  }
} }).prompt();
var jt = { light: w2("\u2500", "-"), heavy: w2("\u2501", "="), block: w2("\u2588", "#") };
var Nt = `${e("gray", $)}  `;
var Pe = (t) => new ht({ validate: t.validate, placeholder: t.placeholder, defaultValue: t.defaultValue, initialValue: t.initialValue, output: t.output, signal: t.signal, input: t.input, render() {
  const i = t?.withGuide ?? h.withGuide, s = `${`${i ? `${e("gray", $)}
` : ""}${P(this.state)}  `}${t.message}
`, r = t.placeholder ? e("inverse", t.placeholder[0]) + e("dim", t.placeholder.slice(1)) : e(["inverse", "hidden"], "_"), u = this.userInput ? this.userInputWithCursor : r, n = this.value ?? "";
  switch (this.state) {
    case "error": {
      const a = this.error ? `  ${e("yellow", this.error)}` : "", c = i ? `${e("yellow", $)}  ` : "", o = i ? e("yellow", x2) : "";
      return `${s.trim()}
${c}${u}
${o}${a}
`;
    }
    case "submit": {
      const a = n ? `  ${e("dim", n)}` : "", c = i ? e("gray", $) : "";
      return `${s}${c}${a}`;
    }
    case "cancel": {
      const a = n ? `  ${e(["strikethrough", "dim"], n)}` : "", c = i ? e("gray", $) : "";
      return `${s}${c}${a}${n.trim() ? `
${c}` : ""}`;
    }
    default: {
      const a = i ? `${e("cyan", $)}  ` : "", c = i ? e("cyan", x2) : "";
      return `${s}${a}${u}
${c}
`;
    }
  }
} }).prompt();

// src/hclaw/auth.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
async function readToken(env = process.env) {
  const fromEnv = env.HF_TOKEN?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const candidates = [
    env.HF_TOKEN_PATH,
    env.HF_HOME && path.join(env.HF_HOME, "token"),
    path.join(os.homedir(), ".cache", "huggingface", "token"),
    path.join(os.homedir(), ".huggingface", "token")
  ].filter((value) => Boolean(value));
  for (const candidate of candidates) {
    try {
      const token = (await fs.readFile(candidate, "utf8")).trim();
      if (token) {
        return token;
      }
    } catch {
    }
  }
  throw new Error("HF token not found. Set HF_TOKEN or run `hf auth login` once.");
}

// src/hclaw/docker.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
var CliDockerRunner = class {
  async pull(image) {
    await docker(["pull", image]);
  }
  async run(params) {
    await docker([
      "run",
      "-d",
      "--name",
      params.containerName,
      "--restart",
      "unless-stopped",
      "--env-file",
      params.envFile,
      "-p",
      `127.0.0.1:${params.port}:${params.port}`,
      "-v",
      `${params.volumeName}:/tmp/openclaw-live`,
      params.image
    ]);
  }
  async start(containerName) {
    await docker(["start", containerName]);
  }
  async stop(containerName) {
    await docker(["stop", containerName]);
  }
  async rm(containerName) {
    await docker(["rm", containerName]);
  }
  async logs(containerName, tail = 200) {
    const { stdout } = await docker(["logs", "--tail", String(tail), containerName]);
    return stdout;
  }
  async inspect(containerName) {
    try {
      const { stdout } = await docker([
        "inspect",
        containerName,
        "--format",
        "{{.State.Running}}	{{.State.Status}}	{{.Config.Image}}"
      ]);
      const [running, status, image] = stdout.trim().split("	");
      return {
        exists: true,
        running: running === "true",
        ...status ? { status } : {},
        ...image ? { image } : {}
      };
    } catch (err) {
      if (err instanceof Error && "code" in err) {
        return null;
      }
      throw err;
    }
  }
};
function containerNameFor(agent) {
  return `huggingclaw-${agent}`;
}
function volumeNameFor(agent) {
  return `huggingclaw-${agent}-live`;
}
async function docker(args) {
  try {
    return await execFileAsync("docker", args, { encoding: "utf8" });
  } catch (err) {
    if (err instanceof Error && "stderr" in err && typeof err.stderr === "string") {
      err.message = `${err.message}
${err.stderr}`;
    }
    throw err;
  }
}

// src/hclaw/gateway-location.ts
function parseGatewayLocation(value) {
  if (value === "local" || value === "space") {
    return value;
  }
  throw new Error("gateway must be one of: local, space");
}

// src/hclaw/git.ts
import { execFile as execFile2 } from "node:child_process";
import fs2 from "node:fs/promises";
import os2 from "node:os";
import path2 from "node:path";
import { fileURLToPath } from "node:url";
import { promisify as promisify2 } from "node:util";

// src/vendor/hfjs-xet/error.ts
async function createApiError(response, opts) {
  const error = new HubApiError(response.url, response.status, response.headers.get("X-Request-Id") ?? opts?.requestId);
  error.message = `Api error with status ${error.statusCode}${opts?.message ? `. ${opts.message}` : ""}`;
  const trailer = [`URL: ${error.url}`, error.requestId ? `Request ID: ${error.requestId}` : void 0].filter(Boolean).join(". ");
  if (response.headers.get("Content-Type")?.startsWith("application/json")) {
    const json = await response.json();
    error.message = json.error || json.message || error.message;
    if (json.error_description) {
      error.message = error.message ? error.message + `: ${json.error_description}` : json.error_description;
    }
    error.data = json;
  } else {
    error.data = { message: await response.text() };
  }
  error.message += `. ${trailer}`;
  throw error;
}
var HubApiError = class extends Error {
  statusCode;
  url;
  requestId;
  data;
  constructor(url, statusCode, requestId, message) {
    super(message);
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.url = url;
  }
};

// src/vendor/hfjs-xet/vendor/lz4js/util.ts
function hashU32(a) {
  a = a | 0;
  a = a + 2127912214 + (a << 12) | 0;
  a = a ^ -949894596 ^ a >>> 19;
  a = a + 374761393 + (a << 5) | 0;
  a = a + -744332180 ^ a << 9;
  a = a + -42973499 + (a << 3) | 0;
  return a ^ -1252372727 ^ a >>> 16 | 0;
}
function readU32(b, n) {
  let x3 = 0;
  x3 |= b[n++] << 0;
  x3 |= b[n++] << 8;
  x3 |= b[n++] << 16;
  x3 |= b[n++] << 24;
  return x3;
}
function writeU32(b, n, x3) {
  b[n++] = x3 >> 0 & 255;
  b[n++] = x3 >> 8 & 255;
  b[n++] = x3 >> 16 & 255;
  b[n++] = x3 >> 24 & 255;
}
function imul(a, b) {
  const ah = a >>> 16;
  const al = a & 65535;
  const bh = b >>> 16;
  const bl = b & 65535;
  return al * bl + (ah * bl + al * bh << 16) | 0;
}

// src/vendor/hfjs-xet/vendor/lz4js/xxh32.ts
var prime1 = 2654435761;
var prime2 = 2246822519;
var prime3 = 3266489917;
var prime4 = 668265263;
var prime5 = 374761393;
function rotl32(x3, r) {
  x3 = x3 | 0;
  r = r | 0;
  return x3 >>> (32 - r | 0) | x3 << r | 0;
}
function rotmul32(h2, r, m2) {
  h2 = h2 | 0;
  r = r | 0;
  m2 = m2 | 0;
  return imul(h2 >>> (32 - r | 0) | h2 << r, m2) | 0;
}
function shiftxor32(h2, s) {
  h2 = h2 | 0;
  s = s | 0;
  return h2 >>> s ^ h2 | 0;
}
function xxhapply(h2, src, m0, s, m1) {
  return rotmul32(imul(src, m0) + h2, s, m1);
}
function xxh1(h2, src, index) {
  return rotmul32(h2 + imul(src[index], prime5), 11, prime1);
}
function xxh4(h2, src, index) {
  return xxhapply(h2, readU32(src, index), prime3, 17, prime4);
}
function xxh16(h2, src, index) {
  return [
    xxhapply(h2[0], readU32(src, index + 0), prime2, 13, prime1),
    xxhapply(h2[1], readU32(src, index + 4), prime2, 13, prime1),
    xxhapply(h2[2], readU32(src, index + 8), prime2, 13, prime1),
    xxhapply(h2[3], readU32(src, index + 12), prime2, 13, prime1)
  ];
}
function xxh32(seed, src, index, len) {
  let h2;
  const l = len;
  if (len >= 16) {
    h2 = [seed + prime1 + prime2, seed + prime2, seed, seed - prime1];
    while (len >= 16) {
      h2 = xxh16(h2, src, index);
      index += 16;
      len -= 16;
    }
    h2 = rotl32(h2[0], 1) + rotl32(h2[1], 7) + rotl32(h2[2], 12) + rotl32(h2[3], 18) + l;
  } else {
    h2 = seed + prime5 + len >>> 0;
  }
  while (len >= 4) {
    h2 = xxh4(h2, src, index);
    index += 4;
    len -= 4;
  }
  while (len > 0) {
    h2 = xxh1(h2, src, index);
    index++;
    len--;
  }
  h2 = shiftxor32(imul(shiftxor32(imul(shiftxor32(h2, 15), prime2), 13), prime3), 16);
  return h2 >>> 0;
}
var hash = xxh32;

// src/vendor/hfjs-xet/vendor/lz4js/index.ts
var minMatch = 4;
var matchSearchLimit = 12;
var minTrailingLitterals = 5;
var skipTrigger = 6;
var hashSize = 1 << 16;
var mlBits = 4;
var mlMask = (1 << mlBits) - 1;
var runBits = 4;
var runMask = (1 << runBits) - 1;
var blockBuf = makeBuffer(5 << 20);
var hashTable = makeHashTable();
var magicNum = 407708164;
var fdVersion = 64;
var bsDefault = 7;
var bsShift = 4;
var bsMap = {
  4: 65536,
  5: 262144,
  6: 1048576,
  7: 4194304
};
function makeHashTable() {
  try {
    return new Uint32Array(hashSize);
  } catch (error) {
    const hashTable2 = new Array(hashSize);
    for (let i = 0; i < hashSize; i++) {
      hashTable2[i] = 0;
    }
    return hashTable2;
  }
}
function clearHashTable(table) {
  for (let i = 0; i < hashSize; i++) {
    table[i] = 0;
  }
}
function makeBuffer(size) {
  return new Uint8Array(size);
}
function sliceArray(array, start, end) {
  return array.slice(start, end);
}
function compressBound(n) {
  return n + n / 255 + 16 | 0;
}
function compressBlock(src, dst, sIndex, sLength, hashTable2) {
  let mIndex, mAnchor, mLength, mOffset, mStep;
  let literalCount, dIndex, sEnd, n;
  dIndex = 0;
  sEnd = sLength + sIndex;
  mAnchor = sIndex;
  let searchMatchCount = (1 << skipTrigger) + 3;
  while (sIndex <= sEnd - matchSearchLimit) {
    const seq = readU32(src, sIndex);
    let hash3 = hashU32(seq) >>> 0;
    hash3 = (hash3 >> 16 ^ hash3) >>> 0 & 65535;
    mIndex = hashTable2[hash3] - 1;
    hashTable2[hash3] = sIndex + 1;
    if (mIndex < 0 || sIndex - mIndex >>> 16 > 0 || readU32(src, mIndex) !== seq) {
      mStep = searchMatchCount++ >> skipTrigger;
      sIndex += mStep;
      continue;
    }
    searchMatchCount = (1 << skipTrigger) + 3;
    literalCount = sIndex - mAnchor;
    mOffset = sIndex - mIndex;
    sIndex += minMatch;
    mIndex += minMatch;
    mLength = sIndex;
    while (sIndex < sEnd - minTrailingLitterals && src[sIndex] === src[mIndex]) {
      sIndex++;
      mIndex++;
    }
    mLength = sIndex - mLength;
    const token = mLength < mlMask ? mLength : mlMask;
    if (literalCount >= runMask) {
      dst[dIndex++] = (runMask << mlBits) + token;
      for (n = literalCount - runMask; n >= 255; n -= 255) {
        dst[dIndex++] = 255;
      }
      dst[dIndex++] = n;
    } else {
      dst[dIndex++] = (literalCount << mlBits) + token;
    }
    for (let i = 0; i < literalCount; i++) {
      dst[dIndex++] = src[mAnchor + i];
    }
    dst[dIndex++] = mOffset;
    dst[dIndex++] = mOffset >> 8;
    if (mLength >= mlMask) {
      for (n = mLength - mlMask; n >= 255; n -= 255) {
        dst[dIndex++] = 255;
      }
      dst[dIndex++] = n;
    }
    mAnchor = sIndex;
  }
  if (mAnchor === 0) {
    return 0;
  }
  literalCount = sEnd - mAnchor;
  if (literalCount >= runMask) {
    dst[dIndex++] = runMask << mlBits;
    for (n = literalCount - runMask; n >= 255; n -= 255) {
      dst[dIndex++] = 255;
    }
    dst[dIndex++] = n;
  } else {
    dst[dIndex++] = literalCount << mlBits;
  }
  sIndex = mAnchor;
  while (sIndex < sEnd) {
    dst[dIndex++] = src[sIndex++];
  }
  return dIndex;
}
function compressFrame(src, dst) {
  let dIndex = 0;
  writeU32(dst, dIndex, magicNum);
  dIndex += 4;
  dst[dIndex++] = fdVersion;
  dst[dIndex++] = bsDefault << bsShift;
  dst[dIndex] = hash(0, dst, 4, dIndex - 4) >> 8;
  dIndex++;
  const maxBlockSize = bsMap[bsDefault];
  let remaining = src.length;
  let sIndex = 0;
  clearHashTable(hashTable);
  while (remaining > 0) {
    let compSize = 0;
    const blockSize = remaining > maxBlockSize ? maxBlockSize : remaining;
    compSize = compressBlock(src, blockBuf, sIndex, blockSize, hashTable);
    if (compSize > blockSize || compSize === 0) {
      writeU32(dst, dIndex, 2147483648 | blockSize);
      dIndex += 4;
      for (let z3 = sIndex + blockSize; sIndex < z3; ) {
        dst[dIndex++] = src[sIndex++];
      }
      remaining -= blockSize;
    } else {
      writeU32(dst, dIndex, compSize);
      dIndex += 4;
      for (let j2 = 0; j2 < compSize; ) {
        dst[dIndex++] = blockBuf[j2++];
      }
      sIndex += blockSize;
      remaining -= blockSize;
    }
  }
  writeU32(dst, dIndex, 0);
  dIndex += 4;
  return dIndex;
}
function compress(src, maxSize) {
  let dst, size;
  if (maxSize === void 0) {
    maxSize = compressBound(src.length);
  }
  dst = makeBuffer(maxSize);
  size = compressFrame(src, dst);
  if (size !== maxSize) {
    dst = sliceArray(dst, 0, size);
  }
  return dst;
}

// src/vendor/hfjs-xet/utils/XetBlob.ts
var XET_CHUNK_HEADER_BYTES = 8;
function bg4_split_bytes(bytes) {
  const ret = new Uint8Array(bytes.byteLength);
  const split = Math.floor(bytes.byteLength / 4);
  const rem = bytes.byteLength % 4;
  const g1_pos = split + (rem >= 1 ? 1 : 0);
  const g2_pos = g1_pos + split + (rem >= 2 ? 1 : 0);
  const g3_pos = g2_pos + split + (rem == 3 ? 1 : 0);
  for (let i = 0, j2 = 0; i < bytes.byteLength; i += 4, j2++) {
    ret[j2] = bytes[i];
  }
  for (let i = 1, j2 = g1_pos; i < bytes.byteLength; i += 4, j2++) {
    ret[j2] = bytes[i];
  }
  for (let i = 2, j2 = g2_pos; i < bytes.byteLength; i += 4, j2++) {
    ret[j2] = bytes[i];
  }
  for (let i = 3, j2 = g3_pos; i < bytes.byteLength; i += 4, j2++) {
    ret[j2] = bytes[i];
  }
  return ret;
}

// src/vendor/hfjs-xet/utils/ChunkCache.ts
var CHUNK_CACHE_INITIAL_SIZE = 1e4;
var CHUNK_CACHE_GROW_FACTOR = 1.5;
var CHUNK_CACHE_MAX_SIZE = 1e6;
var ChunkCache = class {
  index = 0;
  // Index >= 0 means local xorb, < 0 means remote xorb
  xorbIndices;
  // Max 8K chunks per xorb, less than 64K uint16_t
  chunkIndices;
  map = /* @__PURE__ */ new Map();
  // hash -> chunkCacheIndex. Less overhead that way, empty object is 60+B and empty array is 40+B
  hmacs = /* @__PURE__ */ new Set();
  // todo : remove old hmacs
  maxSize;
  constructor(maxSize = CHUNK_CACHE_MAX_SIZE) {
    if (maxSize < 1) {
      throw new Error("maxSize must be at least 1");
    }
    this.maxSize = maxSize;
    this.xorbIndices = new Int32Array(Math.min(CHUNK_CACHE_INITIAL_SIZE, maxSize));
    this.chunkIndices = new Uint16Array(Math.min(CHUNK_CACHE_INITIAL_SIZE, maxSize));
  }
  addChunkToCache(hash3, xorbIndex, chunkIndex, hmac2) {
    if (this.map.has(hash3)) {
      return;
    }
    if (this.map.values().next().value === this.index) {
      this.map.delete(this.map.keys().next().value);
    }
    this.map.set(hash3, this.index);
    if (hmac2 !== null) {
      this.hmacs.add(hmac2);
    }
    if (this.index >= this.xorbIndices.length) {
      const oldXorbIndices = this.xorbIndices;
      const oldChunkIndices = this.chunkIndices;
      this.xorbIndices = new Int32Array(Math.min(this.xorbIndices.length * CHUNK_CACHE_GROW_FACTOR, this.maxSize));
      this.chunkIndices = new Uint16Array(Math.min(this.chunkIndices.length * CHUNK_CACHE_GROW_FACTOR, this.maxSize));
      this.xorbIndices.set(oldXorbIndices);
      this.chunkIndices.set(oldChunkIndices);
    }
    this.xorbIndices[this.index] = xorbIndex;
    this.chunkIndices[this.index] = chunkIndex;
    this.index = (this.index + 1) % this.maxSize;
  }
  getChunk(hash3, hmacFunction) {
    let index = this.map.get(hash3);
    if (index === void 0 && hmacFunction !== null) {
      for (const hmac2 of this.hmacs) {
        index = this.map.get(hmacFunction(hash3, hmac2));
        if (index !== void 0) {
          break;
        }
      }
    }
    if (index === void 0) {
      return void 0;
    }
    return {
      xorbIndex: this.xorbIndices[index],
      chunkIndex: this.chunkIndices[index]
    };
  }
  updateChunkIndex(hash3, chunkIndex) {
    const index = this.map.get(hash3);
    if (index === void 0) {
      throw new Error(`Chunk not found in cache: ${hash3}`);
    }
    this.chunkIndices[index] = chunkIndex;
  }
  removeChunkFromCache(hash3) {
    this.map.delete(hash3);
  }
};

// src/vendor/hfjs-xet/utils/xetWriteToken.ts
var JWT_SAFETY_PERIOD = 6e4;
var JWT_CACHE_SIZE = 1e3;
var jwtPromises = /* @__PURE__ */ new Map();
var jwts = /* @__PURE__ */ new Map();
async function xetWriteToken(params) {
  if (params.xetParams.expiresAt && params.xetParams.casUrl && params.xetParams.accessToken && params.xetParams.expiresAt > new Date(Date.now() + JWT_SAFETY_PERIOD)) {
    return { accessToken: params.xetParams.accessToken, casUrl: params.xetParams.casUrl };
  }
  const key = params.xetParams.refreshWriteTokenUrl;
  const jwt = jwts.get(key);
  if (jwt && jwt.expiresAt > new Date(Date.now() + JWT_SAFETY_PERIOD)) {
    return { accessToken: jwt.accessToken, casUrl: jwt.casUrl };
  }
  const existingPromise = jwtPromises.get(key);
  if (existingPromise) {
    return existingPromise;
  }
  const promise = (async () => {
    const resp = await (params.fetch ?? fetch)(params.xetParams.refreshWriteTokenUrl, {
      headers: {
        ...params.accessToken ? {
          Authorization: `Bearer ${params.accessToken}`
        } : {},
        ...params.xetParams.sessionId ? { "X-Xet-Session-Id": params.xetParams.sessionId } : {}
      }
    });
    if (!resp.ok) {
      throw await createApiError(resp);
    }
    const json = await resp.json();
    const jwt2 = {
      accessToken: json.accessToken,
      expiresAt: new Date(json.exp * 1e3),
      casUrl: json.casUrl
    };
    jwtPromises.delete(key);
    for (const [key2, value] of jwts.entries()) {
      if (value.expiresAt < new Date(Date.now() + JWT_SAFETY_PERIOD)) {
        jwts.delete(key2);
      } else {
        break;
      }
    }
    if (jwts.size >= JWT_CACHE_SIZE) {
      const keyToDelete = jwts.keys().next().value;
      if (keyToDelete) {
        jwts.delete(keyToDelete);
      }
    }
    jwts.set(key, jwt2);
    return {
      accessToken: json.accessToken,
      casUrl: json.casUrl
    };
  })();
  jwtPromises.set(key, promise);
  return promise;
}

// src/vendor/hfjs-xet/utils/shardParser.ts
var HASH_LENGTH = 32;
var XORB_HASH_BOOKEND = "ff".repeat(HASH_LENGTH);
function readHashFromArray(array, offset) {
  let hash3 = "";
  for (let i = 0; i < HASH_LENGTH; i += 8) {
    hash3 += `${array[offset + i + 7].toString(16).padStart(2, "0")}${array[offset + i + 6].toString(16).padStart(2, "0")}${array[offset + i + 5].toString(16).padStart(2, "0")}${array[offset + i + 4].toString(16).padStart(2, "0")}${array[offset + i + 3].toString(16).padStart(2, "0")}${array[offset + i + 2].toString(16).padStart(2, "0")}${array[offset + i + 1].toString(16).padStart(2, "0")}${array[offset + i].toString(16).padStart(2, "0")}`;
  }
  return hash3;
}
async function parseShardData(shardBlob) {
  const shard = new Uint8Array(await shardBlob.arrayBuffer());
  const shardView = new DataView(shard.buffer);
  const magicTag = shard.slice(0, SHARD_MAGIC_TAG.length);
  if (!magicTag.every((byte, i) => byte === SHARD_MAGIC_TAG[i])) {
    throw new Error("Invalid shard magic tag");
  }
  const version = shardView.getBigUint64(SHARD_MAGIC_TAG.length, true);
  if (version !== SHARD_HEADER_VERSION) {
    throw new Error(`Invalid shard version: ${version}`);
  }
  const footerSize = Number(shardView.getBigUint64(SHARD_MAGIC_TAG.length + 8, true));
  const footerStart = shard.length - footerSize;
  const footerVersion = shardView.getBigUint64(footerStart, true);
  if (footerVersion !== SHARD_FOOTER_VERSION) {
    throw new Error(`Invalid shard footer version: ${footerVersion}`);
  }
  const xorbInfoStart = Number(shardView.getBigUint64(footerStart + 16, true));
  const fileLookupStart = Number(shardView.getBigUint64(footerStart + 24, true));
  const hmacKey = readHashFromArray(shard, footerStart + 72);
  const xorbs = [];
  let offset = xorbInfoStart;
  while (offset < fileLookupStart) {
    const xorbHash2 = readHashFromArray(shard, offset);
    offset += HASH_LENGTH;
    if (xorbHash2 === XORB_HASH_BOOKEND) {
      break;
    }
    offset += 4;
    const chunkCount = shardView.getUint32(offset, true);
    offset += 4;
    offset += 4;
    offset += 4;
    const chunks = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunkHash = readHashFromArray(shard, offset);
      offset += HASH_LENGTH;
      const startOffset = shardView.getUint32(offset, true);
      offset += 4;
      const length = shardView.getUint32(offset, true);
      offset += 4;
      offset += 8;
      chunks.push({
        hash: chunkHash,
        startOffset,
        unpackedLength: length
      });
    }
    xorbs.push({
      hash: xorbHash2,
      chunks
    });
  }
  return {
    hmacKey,
    xorbs
  };
}

// src/vendor/hfjs-xet/utils/sum.ts
function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

// src/vendor/hfjs-xet/utils/SplicedBlob.ts
var SplicedBlob = class _SplicedBlob extends Blob {
  originalBlob;
  spliceOperations;
  constructor(originalBlob, spliceOperations) {
    super();
    this.originalBlob = originalBlob;
    this.spliceOperations = spliceOperations;
  }
  static create(originalBlob, operations) {
    for (const op of operations) {
      if (op.start < 0 || op.end < 0) {
        throw new Error("Invalid start/end positions for SplicedBlob");
      }
      if (op.start > originalBlob.size || op.end > originalBlob.size) {
        throw new Error("Invalid start/end positions for SplicedBlob");
      }
      if (op.start > op.end) {
        throw new Error("Invalid start/end positions for SplicedBlob");
      }
    }
    const sortedOps = [...operations].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sortedOps.length - 1; i++) {
      if (sortedOps[i].end > sortedOps[i + 1].start) {
        throw new Error("Overlapping splice operations are not supported");
      }
    }
    return new _SplicedBlob(originalBlob, sortedOps);
  }
  /**
   * Returns the size of the spliced blob.
   * Size = original size - total replaced size + total insert size
   */
  get size() {
    let totalReplacedSize = 0;
    let totalInsertSize = 0;
    for (const op of this.spliceOperations) {
      totalReplacedSize += op.end - op.start;
      totalInsertSize += op.insert.size;
    }
    return this.originalBlob.size - totalReplacedSize + totalInsertSize;
  }
  /**
   * Returns the MIME type of the original blob.
   */
  get type() {
    return this.originalBlob.type;
  }
  /**
   * Returns a new instance of SplicedBlob that is a slice of the current one.
   *
   * The slice is inclusive of the start and exclusive of the end.
   * The slice method does not support negative start/end.
   *
   * @param start beginning of the slice
   * @param end end of the slice
   */
  slice(start = 0, end = this.size) {
    if (start < 0 || end < 0) {
      throw new TypeError("Unsupported negative start/end on SplicedBlob.slice");
    }
    start = Math.min(start, this.size);
    end = Math.min(end, this.size);
    if (start >= end) {
      return new Blob([]);
    }
    const segments = this.segments;
    const segmentBoundaries = [0];
    let cumulativeSize = 0;
    for (const segment of segments) {
      cumulativeSize += segment.size;
      segmentBoundaries.push(cumulativeSize);
    }
    const resultSegments = [];
    for (let i = 0; i < segments.length; i++) {
      const segmentStart = segmentBoundaries[i];
      const segmentEnd = segmentBoundaries[i + 1];
      if (segmentEnd <= start) {
        continue;
      }
      if (segmentStart >= end) {
        break;
      }
      const sliceStart = Math.max(0, start - segmentStart);
      const sliceEnd = Math.min(segments[i].size, end - segmentStart);
      if (sliceStart < sliceEnd) {
        resultSegments.push(segments[i].slice(sliceStart, sliceEnd));
      }
    }
    return new Blob(resultSegments);
  }
  get firstSpliceIndex() {
    return this.spliceOperations[0]?.start ?? Infinity;
  }
  /**
   * Read the spliced blob content and returns it as an ArrayBuffer.
   */
  async arrayBuffer() {
    const segments = this.segments;
    const buffers = await Promise.all(segments.map((segment) => segment.arrayBuffer()));
    const totalSize = sum(buffers.map((buffer) => buffer.byteLength));
    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const buffer of buffers) {
      result.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }
    return result.buffer;
  }
  /**
   * Read the spliced blob content and returns it as a string.
   */
  async text() {
    const buffer = await this.arrayBuffer();
    return new TextDecoder().decode(buffer);
  }
  /**
   * Returns a stream around the spliced blob content.
   */
  stream() {
    const readable = new ReadableStream({
      start: async (controller) => {
        try {
          const segments = this.segments;
          for (const segment of segments) {
            const reader = segment.stream().getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  break;
                }
                controller.enqueue(value);
              }
            } finally {
              reader.releaseLock();
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });
    return readable;
  }
  /**
   * Get all segments that make up the spliced blob.
   * This includes original blob segments between splice operations and insert blobs.
   */
  get segments() {
    const segments = [];
    let currentPosition = 0;
    const sortedOps = [...this.spliceOperations].sort((a, b) => a.start - b.start);
    for (const op of sortedOps) {
      if (currentPosition < op.start) {
        segments.push(this.originalBlob.slice(currentPosition, op.start));
      }
      if (op.insert.size > 0) {
        segments.push(op.insert);
      }
      currentPosition = op.end;
    }
    if (currentPosition < this.originalBlob.size) {
      segments.push(this.originalBlob.slice(currentPosition));
    }
    return segments;
  }
};

// node_modules/gearhash-jit/dist/esm/table.js
var GEAR_TABLE = [
  0xb088d3a9e840f559n,
  0x5652c7f739ed20d6n,
  0x45b28969898972abn,
  0x6b0a89d5b68ec777n,
  0x368f573e8b7a31b7n,
  0x1dc636dce936d94bn,
  0x207a4c4e5554d5b6n,
  0xa474b34628239acbn,
  0x3b06a83e1ca3b912n,
  0x90e78d6c2f02baf7n,
  0xe1c92df7150d9a8an,
  0x8e95053a1086d3adn,
  0x5a2ef4f1b83a0722n,
  0xa50fac949f807faen,
  0x0e7303eb80d8d681n,
  0x99b07edc1570ad0fn,
  0x689d2fb555fd3076n,
  0x00005082119ea468n,
  0xc4b08306a88fcc28n,
  0x3eb0678af6374afdn,
  0xf19f87ab86ad7436n,
  0xf2129fbfbe6bc736n,
  0x481149575c98a4edn,
  0x0000010695477bc5n,
  0x1fba37801a9ceaccn,
  0x3bf06fd663a49b6dn,
  0x99687e9782e3874bn,
  0x79a10673aa50d8e3n,
  0xe4accf9e6211f420n,
  0x2520e71f87579071n,
  0x2bd5d3fd781a8a9bn,
  0x00de4dcddd11c873n,
  0xeaa9311c5a87392fn,
  0xdb748eb617bc40ffn,
  0xaf579a8df620bf6fn,
  0x86a6e5da1b09c2b1n,
  0xcc2fc30ac322a12en,
  0x355e2afec1f74267n,
  0x2d99c8f4c021a47bn,
  0xbade4b4a9404cfc3n,
  0xf7b518721d707d69n,
  0x3286b6587bf32c20n,
  0x0000b68886af270cn,
  0xa115d6e4db8a9079n,
  0x484f7e9c97b2e199n,
  0xccca7bb75713e301n,
  0xbf2584a62bb0f160n,
  0xade7e813625dbcc8n,
  0x000070940d87955an,
  0x8ae69108139e626fn,
  0xbd776ad72fde38a2n,
  0xfb6b001fc2fcc0cfn,
  0xc7a474b8e67bc427n,
  0xbaf6f11610eb5d58n,
  0x09cb1f5b6de770d1n,
  0xb0b219e6977d4c47n,
  0x00ccbc386ea7ad4an,
  0xcc849d0adf973f01n,
  0x73a3ef7d016af770n,
  0xc807d2d386bdbdfen,
  0x7f2ac9966c791730n,
  0xd037a86bc6c504dan,
  0xf3f17c661eaa609dn,
  0xaca626b04daae687n,
  0x755a99374f4a5b07n,
  0x90837ee65b2caeden,
  0x6ee8ad93fd560785n,
  0x0000d9e11053edd8n,
  0x9e063bb2d21cdbd7n,
  0x07ab77f12a01d2b2n,
  0xec550255e6641b44n,
  0x78fb94a8449c14c6n,
  0xc7510e1bc6c0f5f5n,
  0x0000320b36e4cae3n,
  0x827c33262c8b1a2dn,
  0x14675f0b48ea4144n,
  0x267bd3a6498decebn,
  0xf1916ff982f5035en,
  0x86221b7ff434fb88n,
  0x9dbecee7386f49d8n,
  0xea58f8cac80f8f4an,
  0x008d198692fc64d8n,
  0x6d38704fbabf9a36n,
  0xe032cb07d1e7be4cn,
  0x228d21f6ad450890n,
  0x635cb1bfc02589a5n,
  0x4620a1739ca2ce71n,
  0xa7e7dfe3aae5fb58n,
  0x0c10ca932b3c0debn,
  0x2727fee884afed7bn,
  0xa2df1c6df9e2ab1fn,
  0x4dcdd1ac0774f523n,
  0x000070ffad33e24en,
  0xa2ace87bc5977816n,
  0x9892275ab4286049n,
  0xc2861181ddf18959n,
  0xbb9972a042483e19n,
  0xef70cd3766513078n,
  0x00000513abfc9864n,
  0xc058b61858c94083n,
  0x09e850859725e0den,
  0x9197fb3bf83e7d94n,
  0x7e1e626d12b64bcen,
  0x520c54507f7b57d1n,
  0xbee1797174e22416n,
  0x6fd9ac3222e95587n,
  0x0023957c9adfbf3en,
  0xa01c7d7e234bbe15n,
  0xaba2c758b8a38cbbn,
  0x0d1fa0ceec3e2b30n,
  0x0bb6a58b7e60b991n,
  0x4333dd5b9fa26635n,
  0xc2fd3b7d4001c1a3n,
  0xfb41802454731127n,
  0x65a56185a50d18cbn,
  0xf67a02bd8784b54fn,
  0x696f11dd67e65063n,
  0x00002022fca814abn,
  0x8cd6be912db9d852n,
  0x695189b6e9ae8a57n,
  0xee9453b50ada0c28n,
  0xd8fc5ea91a78845en,
  0xab86bf191a4aa767n,
  0x0000c6b5c86415e5n,
  0x267310178e08a22en,
  0xed2d101b078bca25n,
  0x3b41ed84b226a8fbn,
  0x13e622120f28dc06n,
  0xa315f5ebfb706d26n,
  0x8816c34e3301bacen,
  0xe9395b9cbb71fdaen,
  0x002ce9202e721648n,
  0x4283db1d2bb3c91cn,
  0xd77d461ad2b1a6a5n,
  0xe2ec17e46eeb866bn,
  0xb8e0be4039fbc47cn,
  0xdea160c4d5299d04n,
  0x7eec86c8d28c3634n,
  0x2119ad129f98a399n,
  0xa6ccf46b61a283efn,
  0x2c52cedef658c617n,
  0x2db4871169acdd83n,
  0x0000f0d6f39ecbe9n,
  0x3dd5d8c98d2f9489n,
  0x8a1872a22b01f584n,
  0xf282a4c40e7b3cf2n,
  0x8020ec2ccb1ba196n,
  0x6693b6e09e59e313n,
  0x0000ce19cc7c83ebn,
  0x20cb5735f6479c3bn,
  0x762ebf3759d75a5bn,
  0x207bfe823d693975n,
  0xd77dc112339cd9d5n,
  0x9ba7834284627d03n,
  0x217dc513e95f51e9n,
  0xb27b1a29fc5e7816n,
  0x00d5cd9831bb662dn,
  0x71e39b806d75734cn,
  0x7e572af006fb1a23n,
  0xa2734f2f6ae91f85n,
  0xbf82c6b5022cddf2n,
  0x5c3beac60761a0den,
  0xcdc893bb47416998n,
  0x6d1085615c187e01n,
  0x77f8ae30ac277c5dn,
  0x917c6b81122a2c91n,
  0x5b75b699add16967n,
  0x0000cf6ae79a069bn,
  0xf3c40afa60de1104n,
  0x2063127aa59167c3n,
  0x621de62269d1894dn,
  0xd188ac1de62b4726n,
  0x107036e2154b673cn,
  0x0000b85f28553a1dn,
  0xf2ef4e4c18236f3dn,
  0xd9d6de6611b9f602n,
  0xa1fc7955fb47911cn,
  0xeb85fd032f298dbdn,
  0xbe27502fb3befae1n,
  0xe3034251c4cd661en,
  0x441364d354071836n,
  0x0082b36c75f2983en,
  0xb145910316fa66f0n,
  0x021c069c9847caf7n,
  0x2910dfc75a4b5221n,
  0x735b353e1c57a8b5n,
  0xce44312ce98ed96cn,
  0xbc942e4506bdfa65n,
  0xf05086a71257941bn,
  0xfec3b215d351ceadn,
  0x00ae1055e0144202n,
  0xf54b40846f42e454n,
  0x00007fd9c8bcbcc8n,
  0xbfbd9ef317de9bfen,
  0xa804302ff2854e12n,
  0x39ce4957a5e5d8d4n,
  0xffb9e2a45637ba84n,
  0x55b9ad1d9ea0818bn,
  0x00008acbf319178an,
  0x48e2bfc8d0fbfb38n,
  0x8be39841e848b5e8n,
  0x0e2712160696a08bn,
  0xd51096e84b44242an,
  0x1101ba176792e13an,
  0xc22e770f4531689dn,
  0x1689eff272bbc56cn,
  0x00a92a197f5650ecn,
  0xbc765990bda1784en,
  0xc61441e392fcb8aen,
  0x07e13a2ced31e4a0n,
  0x92cbe984234e9d4dn,
  0x8f4ff572bb7d8ac5n,
  0x0b9670c00b963bd0n,
  0x62955a581a03eb01n,
  0x645f83e5ea000254n,
  0x41fce516cd88f299n,
  0xbbda9748da7a98cfn,
  0x0000aab2fe4845fan,
  0x19761b069bf56555n,
  0x8b8f5e8343b6ad56n,
  0x3e5d1cfd144821d9n,
  0xec5c1e2ca2b0cd8fn,
  0xfaf7e0fea7fbb57fn,
  0x000000d3ba12961bn,
  0xda3f90178401b18en,
  0x70ff906de33a5febn,
  0x0527d5a7c06970e7n,
  0x22d8e773607c13e9n,
  0xc9ab70df643c3bacn,
  0xeda4c6dc8abe12e3n,
  0xecef1f410033e78an,
  0x0024c2b274ac72cbn,
  0x06740d954fa900b4n,
  0x1d7a299b323d6304n,
  0xb3c37cb298cbead5n,
  0xc986e3c76178739bn,
  0x9fabea364b46f58an,
  0x6da214c5af85cc56n,
  0x17a43ed8b7a38f84n,
  0x6eccec511d9adbebn,
  0xf9cab30913335afbn,
  0x4a5e60c5f415eed2n,
  0x00006967503672b4n,
  0x9da51d121454bb87n,
  0x84321e13b9bbc816n,
  0xfb3d6fb6ab2fdd8dn,
  0x60305eed8e160a8dn,
  0xcbbf4b14e9946ce8n,
  0x00004f63381b10c3n,
  0x07d5b7816fcc4e10n,
  0xe5a536726a6a8155n,
  0x57afb23447a07fddn,
  0x18f346f7abc9d394n,
  0x636dc655d61ad33dn,
  0xcc8bab4939f7f3f6n,
  0x63c7a906c1dd187bn
];

// node_modules/gearhash-jit/dist/esm/wasm.js
var TABLE_OFFSET = 0;
var HASH_OFFSET = 2048;
var MASK_OFFSET = 2056;
var INPUT_OFFSET = 4096;
var PAGES = 8;
var MAX_INPUT_SIZE = PAGES * 65536 - INPUT_OFFSET;
var wasmMemory = null;
var wasmView = null;
var wasmFn = null;
function toSignedLeb128(n) {
  const bytes = [];
  let value = n | 0;
  for (; ; ) {
    const byte = value & 127;
    value >>= 7;
    if (value === 0 && (byte & 64) === 0 || value === -1 && (byte & 64) !== 0) {
      bytes.push(byte);
      return bytes;
    }
    bytes.push(byte | 128);
  }
}
function toLebU32Padded5(n) {
  return [
    n & 127 | 128,
    n >>> 7 & 127 | 128,
    n >>> 14 & 127 | 128,
    n >>> 21 & 127 | 128,
    n >>> 28 & 15
  ];
}
function generateWasmBytes() {
  const code = [];
  function emit(...bytes) {
    code.push(...bytes);
  }
  emit(0, 97, 115, 109);
  emit(1, 0, 0, 0);
  emit(1, 7, 1, 96, 2, 127, 127, 1, 127);
  emit(2, 11, 1, 2, 106, 115, 3, 109, 101, 109, 2, 0, PAGES);
  emit(3, 2, 1, 0);
  emit(7, 13, 1, 9, 110, 101, 120, 116, 77, 97, 116, 99, 104, 0, 0);
  emit(10);
  const sectionSizeOff = code.length;
  emit(0, 0, 0, 0, 0);
  emit(1);
  const funcSizeOff = code.length;
  emit(0, 0, 0, 0, 0);
  const bodyStart = code.length;
  emit(2, 2, 126, 2, 127);
  emit(65, ...toSignedLeb128(HASH_OFFSET));
  emit(41, 3, 0);
  emit(33, 2);
  emit(65, ...toSignedLeb128(MASK_OFFSET));
  emit(41, 3, 0);
  emit(33, 3);
  emit(32, 0);
  emit(33, 4);
  emit(32, 0);
  emit(32, 1);
  emit(106);
  emit(33, 5);
  emit(2, 64);
  emit(3, 64);
  emit(32, 4);
  emit(32, 5);
  emit(78);
  emit(13, 1);
  emit(32, 2);
  emit(66, 1);
  emit(134);
  emit(32, 4);
  emit(45, 0, 0);
  emit(65, 3);
  emit(116);
  emit(41, 3, 0);
  emit(124);
  emit(34, 2);
  emit(32, 3);
  emit(131);
  emit(80);
  emit(4, 64);
  emit(65, ...toSignedLeb128(HASH_OFFSET));
  emit(32, 2);
  emit(55, 3, 0);
  emit(32, 4);
  emit(32, 0);
  emit(107);
  emit(65, 1);
  emit(106);
  emit(15);
  emit(11);
  emit(32, 4);
  emit(65, 1);
  emit(106);
  emit(33, 4);
  emit(12, 0);
  emit(11);
  emit(11);
  emit(65, ...toSignedLeb128(HASH_OFFSET));
  emit(32, 2);
  emit(55, 3, 0);
  emit(65, 127);
  emit(11);
  const bodySize = code.length - bodyStart;
  const bsPatch = toLebU32Padded5(bodySize);
  for (let i = 0; i < 5; i++)
    code[funcSizeOff + i] = bsPatch[i];
  const secSize = code.length - sectionSizeOff - 5;
  const ssPatch = toLebU32Padded5(secSize);
  for (let i = 0; i < 5; i++)
    code[sectionSizeOff + i] = ssPatch[i];
  return new Uint8Array(code);
}
function initWasm() {
  if (wasmFn)
    return;
  const bytes = generateWasmBytes();
  wasmMemory = new WebAssembly.Memory({ initial: PAGES });
  const module = new WebAssembly.Module(bytes);
  const instance = new WebAssembly.Instance(module, { js: { mem: wasmMemory } });
  wasmFn = instance.exports.nextMatch;
  wasmView = new Uint8Array(wasmMemory.buffer);
  const dv = new DataView(wasmMemory.buffer);
  for (let i = 0; i < 256; i++) {
    dv.setBigUint64(TABLE_OFFSET + i * 8, GEAR_TABLE[i], true);
  }
}
function wasmNextMatch(inputStart, inputLen) {
  return wasmFn(inputStart, inputLen);
}
function getView() {
  return wasmView;
}

// node_modules/gearhash-jit/dist/esm/index.js
var Hasher = class {
  maskBytes;
  /**
   * The current 64-bit rolling hash state as 8 little-endian bytes.
   * Updated after every `nextMatch` call. Zeroed by `resetHash()`.
   */
  hash;
  constructor(mask) {
    initWasm();
    this.maskBytes = new Uint8Array(8);
    this.hash = new Uint8Array(8);
    new DataView(this.maskBytes.buffer).setBigUint64(0, mask, true);
  }
  /**
   * Scan `buf` for the next gear-hash match. The internal hash state
   * carries over between calls (for split-buffer scanning).
   *
   * @returns 1-based byte position of the match, or -1 if none found.
   */
  nextMatch(buf) {
    const len = buf.length;
    if (len === 0)
      return -1;
    if (len > MAX_INPUT_SIZE) {
      throw new RangeError(`Input too large: ${len} > ${MAX_INPUT_SIZE}`);
    }
    const view = getView();
    view.set(this.hash, HASH_OFFSET);
    view.set(this.maskBytes, MASK_OFFSET);
    view.set(buf, INPUT_OFFSET);
    const pos = wasmNextMatch(INPUT_OFFSET, len);
    this.hash.set(view.subarray(HASH_OFFSET, HASH_OFFSET + 8));
    return pos;
  }
  /** Reset rolling hash to zero (call when starting a new chunk). */
  resetHash() {
    this.hash.fill(0);
  }
};

// node_modules/@huggingface/blake3-jit/dist/esm/compress.js
function compress2(cv, cvOff, block, blockOff, out, outOff, full, counter, blockLen, flags) {
  let m0 = block[blockOff] | 0;
  let m1 = block[blockOff + 1] | 0;
  let m2 = block[blockOff + 2] | 0;
  let m3 = block[blockOff + 3] | 0;
  let m4 = block[blockOff + 4] | 0;
  let m5 = block[blockOff + 5] | 0;
  let m6 = block[blockOff + 6] | 0;
  let m7 = block[blockOff + 7] | 0;
  let m8 = block[blockOff + 8] | 0;
  let m9 = block[blockOff + 9] | 0;
  let m10 = block[blockOff + 10] | 0;
  let m11 = block[blockOff + 11] | 0;
  let m12 = block[blockOff + 12] | 0;
  let m13 = block[blockOff + 13] | 0;
  let m14 = block[blockOff + 14] | 0;
  let m15 = block[blockOff + 15] | 0;
  let s0 = cv[cvOff] | 0;
  let s1 = cv[cvOff + 1] | 0;
  let s2 = cv[cvOff + 2] | 0;
  let s3 = cv[cvOff + 3] | 0;
  let s4 = cv[cvOff + 4] | 0;
  let s5 = cv[cvOff + 5] | 0;
  let s6 = cv[cvOff + 6] | 0;
  let s7 = cv[cvOff + 7] | 0;
  let s8 = 1779033703;
  let s9 = 3144134277;
  let s10 = 1013904242;
  let s11 = 2773480762;
  let s12 = counter | 0;
  let s13 = counter / 4294967296 | 0;
  let s14 = blockLen | 0;
  let s15 = flags | 0;
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  {
    const t0 = m0, t1 = m1;
    m0 = m2;
    m2 = m3;
    m3 = m10;
    m10 = m12;
    m12 = m9;
    m9 = m11;
    m11 = m5;
    m5 = t0;
    m1 = m6;
    m6 = m4;
    m4 = m7;
    m7 = m13;
    m13 = m14;
    m14 = m15;
    m15 = m8;
    m8 = t1;
  }
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  {
    const t0 = m0, t1 = m1;
    m0 = m2;
    m2 = m3;
    m3 = m10;
    m10 = m12;
    m12 = m9;
    m9 = m11;
    m11 = m5;
    m5 = t0;
    m1 = m6;
    m6 = m4;
    m4 = m7;
    m7 = m13;
    m13 = m14;
    m14 = m15;
    m15 = m8;
    m8 = t1;
  }
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  {
    const t0 = m0, t1 = m1;
    m0 = m2;
    m2 = m3;
    m3 = m10;
    m10 = m12;
    m12 = m9;
    m9 = m11;
    m11 = m5;
    m5 = t0;
    m1 = m6;
    m6 = m4;
    m4 = m7;
    m7 = m13;
    m13 = m14;
    m14 = m15;
    m15 = m8;
    m8 = t1;
  }
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  {
    const t0 = m0, t1 = m1;
    m0 = m2;
    m2 = m3;
    m3 = m10;
    m10 = m12;
    m12 = m9;
    m9 = m11;
    m11 = m5;
    m5 = t0;
    m1 = m6;
    m6 = m4;
    m4 = m7;
    m7 = m13;
    m13 = m14;
    m14 = m15;
    m15 = m8;
    m8 = t1;
  }
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  {
    const t0 = m0, t1 = m1;
    m0 = m2;
    m2 = m3;
    m3 = m10;
    m10 = m12;
    m12 = m9;
    m9 = m11;
    m11 = m5;
    m5 = t0;
    m1 = m6;
    m6 = m4;
    m4 = m7;
    m7 = m13;
    m13 = m14;
    m14 = m15;
    m15 = m8;
    m8 = t1;
  }
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  {
    const t0 = m0, t1 = m1;
    m0 = m2;
    m2 = m3;
    m3 = m10;
    m10 = m12;
    m12 = m9;
    m9 = m11;
    m11 = m5;
    m5 = t0;
    m1 = m6;
    m6 = m4;
    m4 = m7;
    m7 = m13;
    m13 = m14;
    m14 = m15;
    m15 = m8;
    m8 = t1;
  }
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  if (full) {
    out[outOff + 8] = s8 ^ cv[cvOff];
    out[outOff + 9] = s9 ^ cv[cvOff + 1];
    out[outOff + 10] = s10 ^ cv[cvOff + 2];
    out[outOff + 11] = s11 ^ cv[cvOff + 3];
    out[outOff + 12] = s12 ^ cv[cvOff + 4];
    out[outOff + 13] = s13 ^ cv[cvOff + 5];
    out[outOff + 14] = s14 ^ cv[cvOff + 6];
    out[outOff + 15] = s15 ^ cv[cvOff + 7];
  }
  out[outOff] = s0 ^ s8;
  out[outOff + 1] = s1 ^ s9;
  out[outOff + 2] = s2 ^ s10;
  out[outOff + 3] = s3 ^ s11;
  out[outOff + 4] = s4 ^ s12;
  out[outOff + 5] = s5 ^ s13;
  out[outOff + 6] = s6 ^ s14;
  out[outOff + 7] = s7 ^ s15;
}

// node_modules/@huggingface/blake3-jit/dist/esm/constants.js
var IV = new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);
var CHUNK_START = 1;
var CHUNK_END = 1 << 1;
var PARENT = 1 << 2;
var ROOT = 1 << 3;
var KEYED_HASH = 1 << 4;
var DERIVE_KEY_CONTEXT = 1 << 5;
var DERIVE_KEY_MATERIAL = 1 << 6;
var OUT_LEN = 32;
var KEY_LEN = 32;
var BLOCK_LEN = 64;
var CHUNK_LEN = 1024;
var MAX_DEPTH = 54;
var PERMUTATIONS = new Uint8Array([
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  2,
  6,
  3,
  10,
  7,
  0,
  4,
  13,
  1,
  11,
  12,
  5,
  9,
  14,
  15,
  8,
  3,
  4,
  10,
  12,
  13,
  2,
  7,
  14,
  6,
  5,
  9,
  0,
  11,
  15,
  8,
  1,
  10,
  7,
  12,
  9,
  14,
  3,
  13,
  15,
  4,
  0,
  11,
  2,
  5,
  8,
  1,
  6,
  12,
  13,
  9,
  11,
  15,
  10,
  14,
  8,
  7,
  2,
  5,
  3,
  0,
  1,
  6,
  4,
  9,
  14,
  11,
  5,
  8,
  12,
  15,
  1,
  13,
  3,
  0,
  10,
  2,
  6,
  4,
  7,
  11,
  15,
  5,
  0,
  1,
  9,
  8,
  6,
  14,
  10,
  2,
  12,
  3,
  4,
  7,
  13
]);

// node_modules/@huggingface/blake3-jit/dist/esm/utils.js
var IS_LITTLE_ENDIAN = new Uint8Array(new Uint32Array([16909060]).buffer)[0] === 4;
function readLittleEndianWordsFull(input, offset, words) {
  for (let i = 0; i < 16; ++i, offset += 4) {
    words[i] = input[offset] | input[offset + 1] << 8 | input[offset + 2] << 16 | input[offset + 3] << 24;
  }
}
function writeLittleEndianBytesPartial(words, wordOffset, output, byteOffset, byteCount) {
  const fullWords = byteCount >>> 2;
  let i = 0;
  for (; i < fullWords; ++i, byteOffset += 4) {
    const w3 = words[wordOffset + i];
    output[byteOffset] = w3 & 255;
    output[byteOffset + 1] = w3 >>> 8 & 255;
    output[byteOffset + 2] = w3 >>> 16 & 255;
    output[byteOffset + 3] = w3 >>> 24 & 255;
  }
  const remaining = byteCount & 3;
  if (remaining > 0) {
    const w3 = words[wordOffset + i];
    output[byteOffset] = w3 & 255;
    if (remaining > 1)
      output[byteOffset + 1] = w3 >>> 8 & 255;
    if (remaining > 2)
      output[byteOffset + 2] = w3 >>> 16 & 255;
  }
}
function encodeUTF8(str) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 128) {
      bytes.push(c);
    } else if (c < 2048) {
      bytes.push(192 | c >> 6, 128 | c & 63);
    } else if (c < 55296 || c >= 57344) {
      bytes.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63);
    } else {
      i++;
      c = 65536 + ((c & 1023) << 10 | str.charCodeAt(i) & 1023);
      bytes.push(240 | c >> 18, 128 | c >> 12 & 63, 128 | c >> 6 & 63, 128 | c & 63);
    }
  }
  return new Uint8Array(bytes);
}
var CTZ32_TABLE = new Uint8Array([
  0,
  1,
  28,
  2,
  29,
  14,
  24,
  3,
  30,
  22,
  20,
  15,
  25,
  17,
  4,
  8,
  31,
  27,
  13,
  23,
  21,
  19,
  16,
  7,
  26,
  12,
  18,
  6,
  11,
  5,
  10,
  9
]);

// node_modules/@huggingface/blake3-jit/dist/esm/hasher.js
var XofReader = class {
  inputCv;
  blockWords;
  counter;
  blockLen;
  flags;
  outputBlock;
  outputBlockOffset;
  constructor(inputCv, blockWords, counter, blockLen, flags) {
    this.inputCv = inputCv;
    this.blockWords = blockWords;
    this.counter = counter;
    this.blockLen = blockLen;
    this.flags = flags | ROOT;
    this.outputBlock = new Uint32Array(16);
    this.outputBlockOffset = 64;
  }
  /**
   * Read the next `length` bytes of output.
   */
  read(length) {
    const output = new Uint8Array(length);
    let outputOffset = 0;
    while (outputOffset < length) {
      if (this.outputBlockOffset >= 64) {
        compress2(
          this.inputCv,
          0,
          this.blockWords,
          0,
          this.outputBlock,
          0,
          true,
          // full 64-byte output
          this.counter++,
          this.blockLen,
          this.flags
        );
        this.outputBlockOffset = 0;
      }
      const available = 64 - this.outputBlockOffset;
      const toCopy = Math.min(available, length - outputOffset);
      const wordOffset = this.outputBlockOffset >>> 2;
      const byteWithinWord = this.outputBlockOffset & 3;
      if (byteWithinWord === 0 && toCopy >= 4) {
        const fullWords = toCopy >>> 2;
        writeLittleEndianBytesPartial(this.outputBlock, wordOffset, output, outputOffset, fullWords << 2);
        const bytesCopied = fullWords << 2;
        outputOffset += bytesCopied;
        this.outputBlockOffset += bytesCopied;
      } else {
        for (let i = 0; i < toCopy; i++) {
          const wordIdx = this.outputBlockOffset + i >>> 2;
          const byteIdx = this.outputBlockOffset + i & 3;
          output[outputOffset + i] = this.outputBlock[wordIdx] >>> (byteIdx << 3) & 255;
        }
        outputOffset += toCopy;
        this.outputBlockOffset += toCopy;
      }
    }
    return output;
  }
};
var ChunkState = class {
  chainingValue;
  chunkCounter;
  blockWords;
  blockLen;
  blocksCompressed;
  flags;
  constructor(keyWords, chunkCounter, flags) {
    this.chainingValue = new Uint32Array(keyWords);
    this.chunkCounter = chunkCounter;
    this.blockWords = new Uint32Array(16);
    this.blockLen = 0;
    this.blocksCompressed = 0;
    this.flags = flags;
  }
  resetTo(keyWords, chunkCounter, flags) {
    this.chainingValue.set(keyWords);
    this.chunkCounter = chunkCounter;
    this.blockLen = 0;
    this.blocksCompressed = 0;
    this.flags = flags;
  }
  /**
   * Get the flags for the current block.
   */
  startFlag() {
    return this.blocksCompressed === 0 ? CHUNK_START : 0;
  }
  /**
   * Update the chunk state with input data.
   * Returns the number of bytes consumed.
   */
  update(input, inputOffset, inputLen) {
    let consumed = 0;
    while (inputLen > 0) {
      if (this.blockLen === BLOCK_LEN) {
        compress2(this.chainingValue, 0, this.blockWords, 0, this.chainingValue, 0, false, this.chunkCounter, BLOCK_LEN, this.flags | this.startFlag());
        this.blocksCompressed++;
        this.blockLen = 0;
      }
      const want = BLOCK_LEN - this.blockLen;
      const take = Math.min(want, inputLen);
      if (this.blockLen === 0 && take === BLOCK_LEN) {
        readLittleEndianWordsFull(input, inputOffset, this.blockWords);
      } else {
        for (let i = 0; i < take; i++) {
          const pos = this.blockLen + i;
          const wordIdx = pos >>> 2;
          const byteIdx = pos & 3;
          if (byteIdx === 0) {
            this.blockWords[wordIdx] = input[inputOffset + i];
          } else {
            this.blockWords[wordIdx] |= input[inputOffset + i] << (byteIdx << 3);
          }
        }
      }
      this.blockLen += take;
      inputOffset += take;
      inputLen -= take;
      consumed += take;
    }
    return consumed;
  }
  /**
   * Finalize this chunk and return its output.
   * Returns 8 words (chaining value) or 16 words (if root).
   */
  output() {
    const usedWords = this.blockLen + 3 >>> 2;
    for (let i = usedWords; i < 16; i++) {
      this.blockWords[i] = 0;
    }
    return {
      inputCv: this.chainingValue,
      blockWords: this.blockWords,
      blockLen: this.blockLen,
      counter: this.chunkCounter,
      flags: this.flags | this.startFlag() | CHUNK_END
    };
  }
  /**
   * Get the number of bytes in this chunk.
   */
  len() {
    return this.blocksCompressed * BLOCK_LEN + this.blockLen;
  }
};
var Hasher2 = class _Hasher {
  chunkState;
  keyWords;
  cvStack;
  cvStackLen;
  flags;
  parentBlock;
  parentCv;
  chunkCv;
  outWords;
  finalizeCv;
  /**
   * Create a new Hasher.
   *
   * @param keyWords - Initial key words (IV for regular hashing)
   * @param flags - Domain separation flags
   */
  constructor(keyWords, flags) {
    this.keyWords = keyWords ? new Uint32Array(keyWords) : new Uint32Array(IV);
    this.flags = flags ?? 0;
    this.chunkState = new ChunkState(this.keyWords, 0, this.flags);
    this.cvStack = new Uint32Array(MAX_DEPTH * 8);
    this.cvStackLen = 0;
    this.parentBlock = new Uint32Array(16);
    this.parentCv = new Uint32Array(8);
    this.chunkCv = new Uint32Array(8);
    this.outWords = new Uint32Array(16);
    this.finalizeCv = new Uint32Array(8);
  }
  /**
   * Reset the hasher to process a new message with the same key/flags.
   * Reuses all internal buffers — zero allocations.
   */
  reset() {
    this.chunkState.resetTo(this.keyWords, 0, this.flags);
    this.cvStackLen = 0;
    return this;
  }
  /**
   * Create a new keyed hasher (MAC).
   *
   * @param key - 32-byte key
   */
  static newKeyed(key) {
    if (key.length !== KEY_LEN) {
      throw new Error(`Key must be ${KEY_LEN} bytes, got ${key.length}`);
    }
    const keyWords = new Uint32Array(8);
    if (IS_LITTLE_ENDIAN) {
      const view = new Uint32Array(key.buffer, key.byteOffset, 8);
      keyWords.set(view);
    } else {
      for (let i = 0; i < 8; i++) {
        const off = i * 4;
        keyWords[i] = key[off] | key[off + 1] << 8 | key[off + 2] << 16 | key[off + 3] << 24;
      }
    }
    return new _Hasher(keyWords, KEYED_HASH);
  }
  /**
   * Create a new key derivation hasher.
   *
   * @param context - Context string for domain separation
   */
  static newDeriveKey(context) {
    const contextBytes = encodeUTF8(context);
    const contextHasher = new _Hasher(new Uint32Array(IV), DERIVE_KEY_CONTEXT);
    contextHasher.update(contextBytes);
    const contextKey = new Uint32Array(8);
    const output = contextHasher.finalizeOutput();
    compress2(output.inputCv, 0, output.blockWords, 0, contextKey, 0, false, output.counter, output.blockLen, output.flags | ROOT);
    return new _Hasher(contextKey, DERIVE_KEY_MATERIAL);
  }
  /**
   * Push a chaining value onto the stack.
   */
  pushCv(cv, cvOffset) {
    this.cvStack.set(cv.subarray(cvOffset, cvOffset + 8), this.cvStackLen * 8);
    this.cvStackLen++;
  }
  /**
   * Pop a chaining value from the stack.
   */
  popCv(out, outOffset) {
    this.cvStackLen--;
    out.set(this.cvStack.subarray(this.cvStackLen * 8, (this.cvStackLen + 1) * 8), outOffset);
  }
  /**
   * Add a chunk's chaining value and merge completed subtrees.
   */
  addChunkCv(newCv, newCvOffset, totalChunks) {
    const parentBlock = this.parentBlock;
    const parentCv = this.parentCv;
    while ((totalChunks & 1) === 0) {
      this.popCv(parentBlock, 0);
      parentBlock.set(newCv.subarray(newCvOffset, newCvOffset + 8), 8);
      compress2(this.keyWords, 0, parentBlock, 0, parentCv, 0, false, 0, BLOCK_LEN, this.flags | PARENT);
      newCv = parentCv;
      newCvOffset = 0;
      totalChunks >>>= 1;
    }
    this.pushCv(newCv, newCvOffset);
  }
  /**
   * Update the hasher with input data.
   *
   * @param input - Data to hash
   * @returns this (for chaining)
   */
  update(input) {
    let inputOffset = 0;
    let inputLen = input.length;
    while (inputLen > 0) {
      if (this.chunkState.len() === CHUNK_LEN) {
        const output = this.chunkState.output();
        const chunkCv = this.chunkCv;
        compress2(output.inputCv, 0, output.blockWords, 0, chunkCv, 0, false, output.counter, output.blockLen, output.flags);
        const totalChunks = this.chunkState.chunkCounter + 1;
        this.addChunkCv(chunkCv, 0, totalChunks);
        this.chunkState.resetTo(this.keyWords, totalChunks, this.flags);
      }
      const want = CHUNK_LEN - this.chunkState.len();
      const take = Math.min(want, inputLen);
      this.chunkState.update(input, inputOffset, take);
      inputOffset += take;
      inputLen -= take;
    }
    return this;
  }
  /**
   * Get the output parameters (for XOF mode or finalization).
   */
  finalizeOutput() {
    let output = this.chunkState.output();
    let parentBlock = this.parentBlock;
    let cv = this.finalizeCv;
    if (this.cvStackLen > 0) {
      compress2(output.inputCv, 0, output.blockWords, 0, cv, 0, false, output.counter, output.blockLen, output.flags);
      while (this.cvStackLen > 0) {
        this.cvStackLen--;
        parentBlock.set(this.cvStack.subarray(this.cvStackLen * 8, (this.cvStackLen + 1) * 8), 0);
        parentBlock.set(cv, 8);
        if (this.cvStackLen > 0) {
          compress2(this.keyWords, 0, parentBlock, 0, cv, 0, false, 0, BLOCK_LEN, this.flags | PARENT);
        } else {
          return {
            inputCv: this.keyWords,
            blockWords: parentBlock,
            blockLen: BLOCK_LEN,
            counter: 0,
            flags: this.flags | PARENT
          };
        }
      }
    }
    return output;
  }
  /**
   * Finalize the hash and return the result.
   *
   * @param outputLength - Number of bytes to output (default: 32)
   * @returns The hash output
   */
  finalize(outputLength = OUT_LEN) {
    const output = this.finalizeOutput();
    const result = new Uint8Array(outputLength);
    if (outputLength <= 64) {
      const outWords = this.outWords;
      compress2(
        output.inputCv,
        0,
        output.blockWords,
        0,
        outWords,
        0,
        outputLength > 32,
        // full output if > 32 bytes
        output.counter,
        output.blockLen,
        output.flags | ROOT
      );
      if (IS_LITTLE_ENDIAN) {
        const outBytes = new Uint8Array(outWords.buffer);
        result.set(outBytes.subarray(0, outputLength));
      } else {
        writeLittleEndianBytesPartial(outWords, 0, result, 0, outputLength);
      }
    } else {
      const xof = this.finalizeXof();
      const full = xof.read(outputLength);
      result.set(full);
    }
    return result;
  }
  /**
   * Finalize and return an XOF reader for arbitrary-length output.
   */
  finalizeXof() {
    const output = this.finalizeOutput();
    return new XofReader(new Uint32Array(output.inputCv), new Uint32Array(output.blockWords), output.counter, output.blockLen, output.flags);
  }
};

// node_modules/@huggingface/blake3-jit/dist/esm/wasm-simd.js
function toLebU32Min2(n) {
  return [n & 127 | 128, n >>> 7 & 127];
}
function toLebU32Padded52(n) {
  return [
    n & 127 | 128,
    n >>> 7 & 127 | 128,
    n >>> 14 & 127 | 128,
    n >>> 21 & 127 | 128,
    n >>> 28 & 15
    // Last byte has no continuation bit
  ];
}
function toSignedLeb128_i32(n) {
  const bytes = [];
  let value = n | 0;
  let more = true;
  while (more) {
    let byte = value & 127;
    value >>= 7;
    if (value === 0 && (byte & 64) === 0 || value === -1 && (byte & 64) !== 0) {
      more = false;
    } else {
      byte |= 128;
    }
    bytes.push(byte);
  }
  return bytes;
}
var MSG_ACCESS_ORDER = [
  // Round 1: 0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  // Round 2: 2,6,3,10,7,0,4,13,1,11,12,5,9,14,15,8
  2,
  6,
  3,
  10,
  7,
  0,
  4,
  13,
  1,
  11,
  12,
  5,
  9,
  14,
  15,
  8,
  // Round 3: 3,4,10,12,13,2,7,14,6,5,9,0,11,15,8,1
  3,
  4,
  10,
  12,
  13,
  2,
  7,
  14,
  6,
  5,
  9,
  0,
  11,
  15,
  8,
  1,
  // Round 4: 10,7,12,9,14,3,13,15,4,0,11,2,5,8,1,6
  10,
  7,
  12,
  9,
  14,
  3,
  13,
  15,
  4,
  0,
  11,
  2,
  5,
  8,
  1,
  6,
  // Round 5: 12,13,9,11,15,10,14,8,7,2,5,3,0,1,6,4
  12,
  13,
  9,
  11,
  15,
  10,
  14,
  8,
  7,
  2,
  5,
  3,
  0,
  1,
  6,
  4,
  // Round 6: 9,14,11,5,8,12,15,1,13,3,0,10,2,6,4,7
  9,
  14,
  11,
  5,
  8,
  12,
  15,
  1,
  13,
  3,
  0,
  10,
  2,
  6,
  4,
  7,
  // Round 7: 11,15,5,0,1,9,8,6,14,10,2,12,3,4,7,13
  11,
  15,
  5,
  0,
  1,
  9,
  8,
  6,
  14,
  10,
  2,
  12,
  3,
  4,
  7,
  13
];
function generateWasmBytes2() {
  const code = [];
  function put(bytes) {
    code.push(...bytes);
  }
  put([0, 97, 115, 109]);
  put([1, 0, 0, 0]);
  put([1]);
  put([4]);
  put([1]);
  put([96, 0, 0]);
  put([2]);
  put([11]);
  put([1]);
  put([2, 106, 115]);
  put([3, 109, 101, 109]);
  put([2, 0, 1]);
  put([3]);
  put([4]);
  put([3]);
  put([0]);
  put([0]);
  put([0]);
  put([7]);
  put([50]);
  put([3]);
  put([10]);
  put([99, 111, 109, 112, 114, 101, 115, 115, 52, 120]);
  put([0, 0]);
  put([16]);
  put([
    99,
    111,
    109,
    112,
    114,
    101,
    115,
    115,
    67,
    104,
    117,
    110,
    107,
    115,
    52,
    120
  ]);
  put([0, 1]);
  put([14]);
  put([99, 111, 109, 112, 114, 101, 115, 115, 80, 97, 114, 101, 110, 116]);
  put([0, 2]);
  put([10]);
  const sectionSizeOffset = code.length;
  put([0, 0, 0, 0, 0]);
  put([3]);
  const funcSizeOffset = code.length;
  put([0, 0, 0, 0, 0]);
  const funcBodyStart = code.length;
  put([1]);
  put([32, 123]);
  for (let i = 0; i < 16; i++) {
    put([65, ...toLebU32Min2(i * 16)]);
    put([253, 0, 2, 0]);
    put([33, i]);
  }
  for (let i = 0; i < 8; i++) {
    put([65, ...toLebU32Min2(512 + i * 16)]);
    put([253, 0, 2, 0]);
    put([33, 16 + i]);
  }
  const IV2 = [1779033703, 3144134277, 1013904242, 2773480762];
  for (let i = 0; i < 4; i++) {
    const ivBytes = [];
    for (let j2 = 0; j2 < 4; j2++) {
      ivBytes.push(IV2[i] & 255);
      ivBytes.push(IV2[i] >>> 8 & 255);
      ivBytes.push(IV2[i] >>> 16 & 255);
      ivBytes.push(IV2[i] >>> 24 & 255);
    }
    put([253, 12, ...ivBytes]);
    put([33, 24 + i]);
  }
  put([65, ...toLebU32Min2(768)]);
  put([253, 0, 2, 0]);
  put([33, 28]);
  put([65, ...toLebU32Min2(784)]);
  put([253, 0, 2, 0]);
  put([33, 29]);
  put([65, ...toLebU32Min2(800)]);
  put([253, 0, 2, 0]);
  put([33, 30]);
  put([65, ...toLebU32Min2(816)]);
  put([253, 0, 2, 0]);
  put([33, 31]);
  let msgIdx = 0;
  function g(a, b, c, d) {
    const mx = MSG_ACCESS_ORDER[msgIdx++];
    const my = MSG_ACCESS_ORDER[msgIdx++];
    put([32, 16 + a]);
    put([32, 16 + b]);
    put([253, 174, 1]);
    put([32, mx]);
    put([253, 174, 1]);
    put([33, 16 + a]);
    put([32, 16 + d]);
    put([32, 16 + a]);
    put([253, 81]);
    put([34, 16 + d]);
    put([32, 16 + d]);
    put([253, 13, 2, 3, 0, 1, 6, 7, 4, 5, 10, 11, 8, 9, 14, 15, 12, 13]);
    put([33, 16 + d]);
    put([32, 16 + c]);
    put([32, 16 + d]);
    put([253, 174, 1]);
    put([33, 16 + c]);
    put([32, 16 + b]);
    put([32, 16 + c]);
    put([253, 81]);
    put([34, 16 + b]);
    put([65, 12]);
    put([253, 173, 1]);
    put([32, 16 + b]);
    put([65, 20]);
    put([253, 171, 1]);
    put([253, 80]);
    put([33, 16 + b]);
    put([32, 16 + a]);
    put([32, 16 + b]);
    put([253, 174, 1]);
    put([32, my]);
    put([253, 174, 1]);
    put([33, 16 + a]);
    put([32, 16 + d]);
    put([32, 16 + a]);
    put([253, 81]);
    put([34, 16 + d]);
    put([32, 16 + d]);
    put([253, 13, 1, 2, 3, 0, 5, 6, 7, 4, 9, 10, 11, 8, 13, 14, 15, 12]);
    put([33, 16 + d]);
    put([32, 16 + c]);
    put([32, 16 + d]);
    put([253, 174, 1]);
    put([33, 16 + c]);
    put([32, 16 + b]);
    put([32, 16 + c]);
    put([253, 81]);
    put([34, 16 + b]);
    put([65, 7]);
    put([253, 173, 1]);
    put([32, 16 + b]);
    put([65, 25]);
    put([253, 171, 1]);
    put([253, 80]);
    put([33, 16 + b]);
  }
  for (let round = 0; round < 7; round++) {
    g(0, 4, 8, 12);
    g(1, 5, 9, 13);
    g(2, 6, 10, 14);
    g(3, 7, 11, 15);
    g(0, 5, 10, 15);
    g(1, 6, 11, 12);
    g(2, 7, 8, 13);
    g(3, 4, 9, 14);
  }
  for (let i = 0; i < 8; i++) {
    put([65, ...toLebU32Min2(640 + i * 16)]);
    put([32, 16 + i]);
    put([32, 24 + i]);
    put([253, 81]);
    put([253, 11, 2, 0]);
  }
  put([11]);
  const funcBodySize = code.length - funcBodyStart;
  const funcSizeBytes = toLebU32Padded52(funcBodySize);
  for (let i = 0; i < 5; i++) {
    code[funcSizeOffset + i] = funcSizeBytes[i];
  }
  const func1SizeOffset = code.length;
  put([0, 0, 0, 0, 0]);
  const func1BodyStart = code.length;
  const compressChunksBody = generateCompressChunks4xBody();
  put(compressChunksBody);
  const func1BodySize = code.length - func1BodyStart;
  const func1SizeBytes = toLebU32Padded52(func1BodySize);
  for (let i = 0; i < 5; i++) {
    code[func1SizeOffset + i] = func1SizeBytes[i];
  }
  const func2SizeOffset = code.length;
  put([0, 0, 0, 0, 0]);
  const func2BodyStart = code.length;
  const compressParentBody = generateCompressParentBody();
  put(compressParentBody);
  const func2BodySize = code.length - func2BodyStart;
  const func2SizeBytes = toLebU32Padded52(func2BodySize);
  for (let i = 0; i < 5; i++) {
    code[func2SizeOffset + i] = func2SizeBytes[i];
  }
  const sectionSize = code.length - sectionSizeOffset - 5;
  const sectionSizeBytes = toLebU32Padded52(sectionSize);
  for (let i = 0; i < 5; i++) {
    code[sectionSizeOffset + i] = sectionSizeBytes[i];
  }
  return new Uint8Array(code);
}
function generateCompressChunks4xBody() {
  const code = [];
  function put(bytes) {
    code.push(...bytes);
  }
  put([2]);
  put([32, 123]);
  put([1, 127]);
  const BATCH_BLOCK_WORDS = SIMD_MEMORY.BATCH_BLOCK_WORDS;
  const BATCH_CV = SIMD_MEMORY.BATCH_CV;
  const BATCH_COUNTER_LOW = SIMD_MEMORY.BATCH_COUNTER_LOW;
  const BATCH_FLAGS_BASE = SIMD_MEMORY.BATCH_FLAGS_BASE;
  const BATCH_OUTPUT = SIMD_MEMORY.BATCH_OUTPUT;
  const IV2 = [1779033703, 3144134277, 1013904242, 2773480762];
  for (let i = 0; i < 8; i++) {
    put([65, ...toLebU32Min2(BATCH_CV + i * 16)]);
    put([253, 0, 2, 0]);
    put([33, 16 + i]);
  }
  put([65, 0]);
  put([33, 32]);
  put([2, 64]);
  put([3, 64]);
  for (let w3 = 0; w3 < 16; w3++) {
    put([32, 32]);
    put([65, ...toLebU32Min2(256)]);
    put([108]);
    put([65, ...toLebU32Min2(BATCH_BLOCK_WORDS + w3 * 16)]);
    put([106]);
    put([253, 0, 2, 0]);
    put([33, w3]);
  }
  for (let i = 0; i < 4; i++) {
    const ivBytes = [];
    for (let j2 = 0; j2 < 4; j2++) {
      ivBytes.push(IV2[i] & 255);
      ivBytes.push(IV2[i] >>> 8 & 255);
      ivBytes.push(IV2[i] >>> 16 & 255);
      ivBytes.push(IV2[i] >>> 24 & 255);
    }
    put([253, 12, ...ivBytes]);
    put([33, 24 + i]);
  }
  put([65, ...toLebU32Min2(BATCH_COUNTER_LOW)]);
  put([253, 0, 2, 0]);
  put([33, 28]);
  put([253, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  put([33, 29]);
  const blockLen64 = [];
  for (let j2 = 0; j2 < 4; j2++) {
    blockLen64.push(64, 0, 0, 0);
  }
  put([253, 12, ...blockLen64]);
  put([33, 30]);
  put([65, ...toLebU32Min2(BATCH_FLAGS_BASE)]);
  put([253, 0, 2, 0]);
  put([32, 32]);
  put([69]);
  put([32, 32]);
  put([65, 15]);
  put([70]);
  put([65, 1]);
  put([116]);
  put([114]);
  put([253, 17]);
  put([253, 80]);
  put([33, 31]);
  let msgIdx = 0;
  function g(a, b, c, d) {
    const mx = MSG_ACCESS_ORDER[msgIdx++];
    const my = MSG_ACCESS_ORDER[msgIdx++];
    put([32, 16 + a]);
    put([32, 16 + b]);
    put([253, 174, 1]);
    put([32, mx]);
    put([253, 174, 1]);
    put([33, 16 + a]);
    put([32, 16 + d]);
    put([32, 16 + a]);
    put([253, 81]);
    put([34, 16 + d]);
    put([32, 16 + d]);
    put([253, 13, 2, 3, 0, 1, 6, 7, 4, 5, 10, 11, 8, 9, 14, 15, 12, 13]);
    put([33, 16 + d]);
    put([32, 16 + c]);
    put([32, 16 + d]);
    put([253, 174, 1]);
    put([33, 16 + c]);
    put([32, 16 + b]);
    put([32, 16 + c]);
    put([253, 81]);
    put([34, 16 + b]);
    put([65, 12]);
    put([253, 173, 1]);
    put([32, 16 + b]);
    put([65, 20]);
    put([253, 171, 1]);
    put([253, 80]);
    put([33, 16 + b]);
    put([32, 16 + a]);
    put([32, 16 + b]);
    put([253, 174, 1]);
    put([32, my]);
    put([253, 174, 1]);
    put([33, 16 + a]);
    put([32, 16 + d]);
    put([32, 16 + a]);
    put([253, 81]);
    put([34, 16 + d]);
    put([32, 16 + d]);
    put([253, 13, 1, 2, 3, 0, 5, 6, 7, 4, 9, 10, 11, 8, 13, 14, 15, 12]);
    put([33, 16 + d]);
    put([32, 16 + c]);
    put([32, 16 + d]);
    put([253, 174, 1]);
    put([33, 16 + c]);
    put([32, 16 + b]);
    put([32, 16 + c]);
    put([253, 81]);
    put([34, 16 + b]);
    put([65, 7]);
    put([253, 173, 1]);
    put([32, 16 + b]);
    put([65, 25]);
    put([253, 171, 1]);
    put([253, 80]);
    put([33, 16 + b]);
  }
  for (let round = 0; round < 7; round++) {
    g(0, 4, 8, 12);
    g(1, 5, 9, 13);
    g(2, 6, 10, 14);
    g(3, 7, 11, 15);
    g(0, 5, 10, 15);
    g(1, 6, 11, 12);
    g(2, 7, 8, 13);
    g(3, 4, 9, 14);
  }
  for (let i = 0; i < 8; i++) {
    put([32, 16 + i]);
    put([32, 24 + i]);
    put([253, 81]);
    put([33, 16 + i]);
  }
  put([32, 32]);
  put([65, 1]);
  put([106]);
  put([34, 32]);
  put([65, 16]);
  put([73]);
  put([13, 0]);
  put([11]);
  put([11]);
  for (let i = 0; i < 8; i++) {
    put([65, ...toLebU32Min2(BATCH_OUTPUT + i * 16)]);
    put([32, 16 + i]);
    put([253, 11, 2, 0]);
  }
  put([11]);
  return code;
}
function generateCompressParentBody() {
  const code = [];
  function put(bytes) {
    code.push(...bytes);
  }
  put([1]);
  put([32, 127]);
  const PARENT_BLOCK_OFFSET = SIMD_MEMORY.PARENT_BLOCK;
  const CHUNK_CV_OFFSET = SIMD_MEMORY.CHUNK_CV;
  const IV2 = [
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ];
  for (let i = 0; i < 16; i++) {
    put([65, ...toLebU32Min2(PARENT_BLOCK_OFFSET + i * 4)]);
    put([40, 2, 0]);
    put([33, i]);
  }
  for (let i = 0; i < 8; i++) {
    put([65, ...toSignedLeb128_i32(IV2[i])]);
    put([33, 16 + i]);
  }
  for (let i = 0; i < 4; i++) {
    put([65, ...toSignedLeb128_i32(IV2[i])]);
    put([33, 24 + i]);
  }
  put([65, 0]);
  put([33, 28]);
  put([65, 0]);
  put([33, 29]);
  put([65, 192, 0]);
  put([33, 30]);
  put([65, 4]);
  put([33, 31]);
  function g(a, b, c, d, mx, my) {
    const sa = 16 + a, sb = 16 + b, sc = 16 + c, sd = 16 + d;
    put([32, sa]);
    put([32, sb]);
    put([106]);
    put([32, mx]);
    put([106]);
    put([33, sa]);
    put([32, sd]);
    put([32, sa]);
    put([115]);
    put([65, 16]);
    put([120]);
    put([33, sd]);
    put([32, sc]);
    put([32, sd]);
    put([106]);
    put([33, sc]);
    put([32, sb]);
    put([32, sc]);
    put([115]);
    put([65, 12]);
    put([120]);
    put([33, sb]);
    put([32, sa]);
    put([32, sb]);
    put([106]);
    put([32, my]);
    put([106]);
    put([33, sa]);
    put([32, sd]);
    put([32, sa]);
    put([115]);
    put([65, 8]);
    put([120]);
    put([33, sd]);
    put([32, sc]);
    put([32, sd]);
    put([106]);
    put([33, sc]);
    put([32, sb]);
    put([32, sc]);
    put([115]);
    put([65, 7]);
    put([120]);
    put([33, sb]);
  }
  let msgIdx = 0;
  for (let round = 0; round < 7; round++) {
    g(0, 4, 8, 12, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(1, 5, 9, 13, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(2, 6, 10, 14, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(3, 7, 11, 15, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(0, 5, 10, 15, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(1, 6, 11, 12, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(2, 7, 8, 13, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(3, 4, 9, 14, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
  }
  for (let i = 0; i < 8; i++) {
    put([65, ...toLebU32Min2(CHUNK_CV_OFFSET + i * 4)]);
    put([32, 16 + i]);
    put([32, 24 + i]);
    put([115]);
    put([54, 2, 0]);
  }
  put([11]);
  return code;
}
var wasmInstance = null;
var wasmMemory2 = null;
var wasmCompress4x = null;
var wasmCompressChunks4x = null;
var wasmCompressParent = null;
var wasmMemoryView = null;
var wasmMemoryView32 = null;
function isSimdSupported() {
  try {
    const simdTest = new Uint8Array([
      0,
      97,
      115,
      109,
      // magic: \0asm
      1,
      0,
      0,
      0,
      // version: 1
      // Type section (id=1): () -> v128
      1,
      // section id = 1 (type)
      5,
      // section length = 5
      1,
      // 1 type
      96,
      0,
      1,
      123,
      // func () -> v128
      // Function section (id=3)
      3,
      // section id = 3 (function)
      2,
      // section length = 2
      1,
      // 1 function
      0,
      // type index 0
      // Code section (id=10) with v128.const
      10,
      // section id = 10 (code)
      22,
      // section length = 22
      1,
      // 1 function body
      20,
      // body length = 20
      0,
      // 0 locals
      253,
      12,
      // v128.const opcode
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      11
      // end
    ]);
    return WebAssembly.validate(simdTest);
  } catch {
    return false;
  }
}
function setupArenaViews() {
  if (!wasmMemory2)
    return;
  const buffer = wasmMemory2.buffer;
  arenaCvStack = new Uint32Array(buffer, SIMD_MEMORY.CV_STACK, 64 * 8);
  arenaParentBlock = new Uint32Array(buffer, SIMD_MEMORY.PARENT_BLOCK, 16);
  arenaChunkCv = new Uint32Array(buffer, SIMD_MEMORY.CHUNK_CV, 8);
  arenaTempCvs = new Uint32Array(buffer, SIMD_MEMORY.TEMP_CVS, 32);
  arenaBatchBlockWords = new Uint32Array(buffer, SIMD_MEMORY.BATCH_BLOCK_WORDS, 16 * 16 * 4);
  arenaBatchCv = new Uint32Array(buffer, SIMD_MEMORY.BATCH_CV, 32);
  arenaBatchCounterLow = new Uint32Array(buffer, SIMD_MEMORY.BATCH_COUNTER_LOW, 4);
  arenaBatchFlagsBase = new Uint32Array(buffer, SIMD_MEMORY.BATCH_FLAGS_BASE, 4);
  arenaBatchOutput = new Uint32Array(buffer, SIMD_MEMORY.BATCH_OUTPUT, 32);
}
var cachedWasmBytes = null;
function initSimdSync() {
  if (wasmInstance)
    return true;
  if (!isSimdSupported()) {
    return false;
  }
  try {
    const wasmBytes = cachedWasmBytes || generateWasmBytes2();
    cachedWasmBytes = wasmBytes;
    wasmMemory2 = new WebAssembly.Memory({ initial: 1 });
    const importObject = {
      js: { mem: wasmMemory2 }
    };
    const module = new WebAssembly.Module(wasmBytes.buffer);
    wasmInstance = new WebAssembly.Instance(module, importObject);
    wasmCompress4x = wasmInstance.exports.compress4x;
    wasmCompressChunks4x = wasmInstance.exports.compressChunks4x;
    wasmCompressParent = wasmInstance.exports.compressParent;
    wasmMemoryView = new Uint8Array(wasmMemory2.buffer);
    wasmMemoryView32 = new Uint32Array(wasmMemory2.buffer);
    setupArenaViews();
    return true;
  } catch (e2) {
    console.warn("Failed to initialize WASM SIMD:", e2);
    return false;
  }
}
var SIMD_MEMORY = {
  // SIMD compress4x working area (used by WASM code) - single block
  BLOCK_WORDS: 0,
  // 4 x 16 words = 512 bytes (transposed layout)
  CHAINING_VALUES: 512,
  // 4 x 8 words = 128 bytes
  OUTPUT: 640,
  // 4 x 8 words = 128 bytes
  COUNTER_LOW: 768,
  // 4 words = 16 bytes
  COUNTER_HIGH: 784,
  // 4 words = 16 bytes
  BLOCK_LEN: 800,
  // 4 words = 16 bytes
  FLAGS: 816,
  // 4 words = 16 bytes
  // End of single-block SIMD working area: 832 bytes
  // SIMD compressChunks4x working area - 16 blocks batched
  // Each block position has 16 v128 values (one per message word) = 256 bytes
  // 16 block positions = 16 × 256 = 4096 bytes
  BATCH_BLOCK_WORDS: 832,
  // 16 positions × 256 bytes = 4096 bytes (transposed), ends at 4928
  BATCH_CV: 4928,
  // 4 × 8 words × 4 bytes = 128 bytes (working CVs), ends at 5056
  BATCH_COUNTER_LOW: 5056,
  // 4 words × 4 bytes = 16 bytes (per-chunk counters), ends at 5072
  BATCH_FLAGS_BASE: 5072,
  // 4 words × 4 bytes = 16 bytes (base flags, no START/END), ends at 5088
  BATCH_OUTPUT: 5088,
  // 4 × 8 words × 4 bytes = 128 bytes (final output), ends at 5216
  // End of batch working area: 5216 bytes
  // WASM Arena: JS working buffers (accessed via TypedArray views)
  CV_STACK: 5216,
  // 64 levels × 8 words × 4 bytes = 2048 bytes, ends at 7264
  PARENT_BLOCK: 7264,
  // 16 words × 4 bytes = 64 bytes, ends at 7328
  CHUNK_CV: 7328,
  // 8 words × 4 bytes = 32 bytes, ends at 7360
  TEMP_CVS: 7360
  // 4 × 8 words × 4 bytes = 128 bytes, ends at 7488
  // Total arena usage: ~7488 bytes (fits comfortably in 64KB page)
};
var arenaCvStack = null;
var arenaParentBlock = null;
var arenaChunkCv = null;
var arenaTempCvs = null;
var arenaBatchBlockWords = null;
var arenaBatchCv = null;
var arenaBatchCounterLow = null;
var arenaBatchFlagsBase = null;
var arenaBatchOutput = null;

// node_modules/@huggingface/blake3-jit/dist/esm/hash.js
var CV_STACK_DEPTH = 64;
var HYPER_CV_STACK = new Uint32Array(CV_STACK_DEPTH * 8);
var CV_POOL_SIZE = 64;
var CV_POOL = new Uint32Array(CV_POOL_SIZE * 8);
var CV_VIEWS = [];
for (let i = 0; i < CV_POOL_SIZE; i++) {
  CV_VIEWS.push(CV_POOL.subarray(i * 8, i * 8 + 8));
}
var simdAvailable = false;
var SIMD_THRESHOLD = 4 * CHUNK_LEN;
function ensureSimdSync() {
  if (simdAvailable)
    return true;
  simdAvailable = initSimdSync();
  return simdAvailable;
}
var simdChunkCvs = new Uint32Array(32);
var reusableTempCv = new Uint32Array(8);
var reusableChunkCv = new Uint32Array(8);
var reusablePureParentBlock = new Uint32Array(16);
var reusablePureParentCv = new Uint32Array(8);
var reusableSimdCvs = new Uint32Array(32);
var reusableSimdParentBlock = new Uint32Array(16);
var reusableSimdParentCv = new Uint32Array(8);
var reusableOffsets = new Uint32Array(4);
var reusableCounters = new Uint32Array(4);
var reusableBlockLens = new Uint32Array(4);
var reusableFlags = new Uint32Array(4);
var reusableOut8 = new Uint32Array(8);
var reusableOut8View = new Uint8Array(reusableOut8.buffer, 0, 32);
var SIMD_CV_BASE = SIMD_MEMORY.CHAINING_VALUES / 4;
var SIMD_OUT_BASE = SIMD_MEMORY.OUTPUT / 4;
var SIMD_COUNTER_LOW_BASE = SIMD_MEMORY.COUNTER_LOW / 4;
var SIMD_COUNTER_HIGH_BASE = SIMD_MEMORY.COUNTER_HIGH / 4;
var SIMD_BLOCK_LEN_BASE = SIMD_MEMORY.BLOCK_LEN / 4;
var BATCH_CV_BASE = SIMD_MEMORY.BATCH_CV / 4;
var BATCH_COUNTER_LOW_BASE = SIMD_MEMORY.BATCH_COUNTER_LOW / 4;
var BATCH_FLAGS_BASE_OFFSET = SIMD_MEMORY.BATCH_FLAGS_BASE / 4;
var BATCH_OUTPUT_BASE = SIMD_MEMORY.BATCH_OUTPUT / 4;
var batchChunkOffsets = new Uint32Array(4);
var SIMD_FLAGS_BASE = SIMD_MEMORY.FLAGS / 4;
function warmupSimd() {
  return ensureSimdSync();
}

// node_modules/@huggingface/blake3-jit/dist/esm/index.js
if (typeof globalThis !== "undefined" && typeof globalThis.document !== "undefined") {
  queueMicrotask(() => {
    warmupSimd();
  });
}

// node_modules/@huggingface/xetchunk-wasm/dist/esm/xet-chunker.js
var TARGET_CHUNK_SIZE = 64 * 1024;
var MINIMUM_CHUNK_DIVISOR = 8;
var MAXIMUM_CHUNK_MULTIPLIER = 2;
var HASH_WINDOW_SIZE = 64;
var BLAKE3_DATA_KEY = new Uint8Array([
  102,
  151,
  245,
  119,
  91,
  149,
  80,
  222,
  49,
  53,
  203,
  172,
  165,
  151,
  24,
  28,
  157,
  228,
  33,
  16,
  155,
  235,
  43,
  88,
  180,
  208,
  176,
  75,
  147,
  173,
  242,
  41
]);
var XetChunker = class {
  minimumChunk;
  maximumChunk;
  chunkBuf;
  curChunkLen;
  gear;
  blake3;
  constructor(targetChunkSize = TARGET_CHUNK_SIZE) {
    if (targetChunkSize <= 0) {
      throw new Error("Target chunk size must be greater than 0");
    }
    if ((targetChunkSize & targetChunkSize - 1) !== 0) {
      throw new Error("Target chunk size must be a power of 2");
    }
    if (targetChunkSize <= HASH_WINDOW_SIZE) {
      throw new Error("Target chunk size must be greater than hash window size");
    }
    if (targetChunkSize >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Target chunk size must be less than Number.MAX_SAFE_INTEGER");
    }
    let mask = BigInt(targetChunkSize - 1);
    let leadingZeros = 0;
    for (let i = 63; i >= 0; i--) {
      if ((mask & 1n << BigInt(i)) !== 0n) {
        break;
      }
      leadingZeros++;
    }
    mask = mask << BigInt(leadingZeros);
    const maximumChunk = targetChunkSize * MAXIMUM_CHUNK_MULTIPLIER;
    this.minimumChunk = targetChunkSize / MINIMUM_CHUNK_DIVISOR;
    this.maximumChunk = maximumChunk;
    this.chunkBuf = new Uint8Array(maximumChunk);
    this.curChunkLen = 0;
    this.gear = new Hasher(mask);
    this.blake3 = Hasher2.newKeyed(BLAKE3_DATA_KEY);
  }
  /**
   * Streaming entry point: accepts an arbitrary slice of data, accumulates
   * it, and emits a chunk when a boundary (or max size) is reached.
   * Data is copied into an internal buffer because it may span calls.
   */
  next(data, isFinal) {
    const nBytes = data.length;
    let createChunk = false;
    let consumeLen = 0;
    if (nBytes !== 0) {
      if (this.curChunkLen + HASH_WINDOW_SIZE < this.minimumChunk) {
        const maxAdvance = Math.min(this.minimumChunk - this.curChunkLen - HASH_WINDOW_SIZE - 1, nBytes - consumeLen);
        consumeLen += maxAdvance;
        this.curChunkLen += maxAdvance;
      }
      const readEnd = Math.min(nBytes, consumeLen + this.maximumChunk - this.curChunkLen);
      let bytesToNextBoundary;
      const position = this.gear.nextMatch(data.subarray(consumeLen, readEnd));
      if (position !== -1) {
        bytesToNextBoundary = position;
        createChunk = true;
      } else {
        bytesToNextBoundary = readEnd - consumeLen;
      }
      if (bytesToNextBoundary + this.curChunkLen >= this.maximumChunk) {
        bytesToNextBoundary = this.maximumChunk - this.curChunkLen;
        createChunk = true;
      }
      this.curChunkLen += bytesToNextBoundary;
      consumeLen += bytesToNextBoundary;
      this.chunkBuf.set(data.subarray(0, consumeLen), this.curChunkLen - consumeLen);
    }
    if (createChunk || isFinal && this.curChunkLen > 0) {
      const chunkData = this.chunkBuf.subarray(0, this.curChunkLen);
      const hash3 = this.blake3.reset().update(chunkData).finalize(32);
      const chunk = {
        length: chunkData.length,
        hash: hash3
      };
      this.curChunkLen = 0;
      this.gear.resetHash();
      return {
        chunk,
        bytesConsumed: consumeLen
      };
    }
    return {
      chunk: null,
      bytesConsumed: consumeLen
    };
  }
  /**
   * Batch entry point: processes a large contiguous buffer and returns all
   * complete chunks. Hashes directly from `data` — no intermediate copy
   * to chunkBuf — for every chunk whose bytes are fully within `data`.
   */
  nextBlock(data, isFinal) {
    const chunks = [];
    let pos = 0;
    while (pos < data.length && this.curChunkLen > 0) {
      const result = this.next(data.subarray(pos), false);
      if (result.chunk)
        chunks.push(result.chunk);
      pos += result.bytesConsumed;
    }
    const minSkip = this.minimumChunk > HASH_WINDOW_SIZE ? this.minimumChunk - HASH_WINDOW_SIZE - 1 : 0;
    while (pos < data.length) {
      const chunkStart = pos;
      const scanStart = Math.min(pos + minSkip, data.length);
      const scanEnd = Math.min(data.length, pos + this.maximumChunk);
      const position = this.gear.nextMatch(data.subarray(scanStart, scanEnd));
      let chunkEnd;
      let foundBoundary;
      if (position !== -1 && scanStart + position - chunkStart <= this.maximumChunk) {
        chunkEnd = scanStart + position;
        foundBoundary = true;
      } else if (scanEnd - chunkStart >= this.maximumChunk) {
        chunkEnd = chunkStart + this.maximumChunk;
        foundBoundary = true;
      } else {
        foundBoundary = false;
        chunkEnd = scanEnd;
      }
      if (foundBoundary) {
        const hash3 = this.blake3.reset().update(data.subarray(chunkStart, chunkEnd)).finalize(32);
        chunks.push({ length: chunkEnd - chunkStart, hash: hash3 });
        pos = chunkEnd;
        this.gear.resetHash();
      } else if (isFinal) {
        const hash3 = this.blake3.reset().update(data.subarray(chunkStart)).finalize(32);
        chunks.push({ length: data.length - chunkStart, hash: hash3 });
        pos = data.length;
      } else {
        this.chunkBuf.set(data.subarray(chunkStart), 0);
        this.curChunkLen = data.length - chunkStart;
        pos = data.length;
      }
    }
    return chunks;
  }
  finish() {
    if (this.curChunkLen > 0) {
      const chunkData = this.chunkBuf.subarray(0, this.curChunkLen);
      const hash3 = this.blake3.reset().update(chunkData).finalize(32);
      const chunk = { length: this.curChunkLen, hash: hash3 };
      this.curChunkLen = 0;
      this.gear.resetHash();
      return chunk;
    }
    return null;
  }
};
function createChunker(targetChunkSize = TARGET_CHUNK_SIZE) {
  return new XetChunker(targetChunkSize);
}
function nextBlock(chunker, data) {
  return chunker.nextBlock(data, false);
}
function finalize(chunker) {
  return chunker.finish();
}
function hashToHex(hash3) {
  const view = new DataView(hash3.buffer, hash3.byteOffset, hash3.byteLength);
  const u64 = view.getBigUint64(0, true);
  const u64_2 = view.getBigUint64(8, true);
  const u64_3 = view.getBigUint64(16, true);
  const u64_4 = view.getBigUint64(24, true);
  return u64.toString(16).padStart(16, "0") + u64_2.toString(16).padStart(16, "0") + u64_3.toString(16).padStart(16, "0") + u64_4.toString(16).padStart(16, "0");
}
function hexToBytes(hex) {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, BigInt("0x" + hex.slice(0, 16)), true);
  view.setBigUint64(8, BigInt("0x" + hex.slice(16, 32)), true);
  view.setBigUint64(16, BigInt("0x" + hex.slice(32, 48)), true);
  view.setBigUint64(24, BigInt("0x" + hex.slice(48, 64)), true);
  return bytes;
}

// node_modules/@huggingface/xetchunk-wasm/dist/esm/xorb-hash.js
var MEAN_CHUNK_PER_NODE = 4;
var BLAKE3_NODE_KEY = new Uint8Array([
  1,
  126,
  197,
  199,
  165,
  71,
  41,
  150,
  253,
  148,
  102,
  102,
  180,
  138,
  2,
  230,
  93,
  221,
  83,
  111,
  55,
  199,
  109,
  210,
  248,
  99,
  82,
  230,
  74,
  83,
  113,
  63
]);
var INDEX_OF_LAST_BYTE_OF_LAST_U64_IN_CHUNK_HASH = 3 * 8;
var nodeHasher = Hasher2.newKeyed(BLAKE3_NODE_KEY);
function xorbHash(chunks) {
  if (chunks.length === 0) {
    return new Uint8Array(32);
  }
  let currentChunks = chunks;
  while (currentChunks.length > 1) {
    const nodes = [];
    let currentIndex = 0;
    let numOfChildrenSoFar = 0;
    for (let i = 0; i < currentChunks.length; i++) {
      if (i === currentChunks.length - 1 || numOfChildrenSoFar === 2 * MEAN_CHUNK_PER_NODE || numOfChildrenSoFar >= 2 && currentChunks[i].hash[INDEX_OF_LAST_BYTE_OF_LAST_U64_IN_CHUNK_HASH] % MEAN_CHUNK_PER_NODE === 0) {
        nodes.push(mergedHashOfSequence(currentChunks.slice(currentIndex, i + 1)));
        currentIndex = i + 1;
        numOfChildrenSoFar = 0;
      } else {
        numOfChildrenSoFar++;
      }
    }
    currentChunks = nodes;
  }
  return currentChunks[0].hash;
}
function mergedHashOfSequence(chunks) {
  let text = "";
  let totalLength = 0;
  for (const chunk of chunks) {
    text += hashToHex(chunk.hash) + " : " + chunk.length + "\n";
    totalLength += chunk.length;
  }
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i);
  }
  const hash3 = nodeHasher.reset().update(bytes).finalize(32);
  return { hash: hash3, length: totalLength };
}

// node_modules/@huggingface/xetchunk-wasm/dist/esm/hash-utils.js
var ZERO_KEY = new Uint8Array(32);
var VERIFICATION_KEY = new Uint8Array([
  127,
  24,
  87,
  214,
  206,
  86,
  237,
  102,
  18,
  127,
  249,
  19,
  231,
  165,
  195,
  243,
  164,
  205,
  38,
  213,
  181,
  219,
  73,
  230,
  65,
  36,
  152,
  127,
  40,
  251,
  148,
  195
]);
var fileHasher = Hasher2.newKeyed(ZERO_KEY);
var verificationHasher = Hasher2.newKeyed(VERIFICATION_KEY);
function fileHash(chunks) {
  const xorb = xorbHash(chunks);
  return fileHasher.reset().update(xorb).finalize(32);
}
function hmac(hash3, key) {
  return Hasher2.newKeyed(key).update(hash3).finalize(32);
}
function verificationHash(chunkHashes) {
  const combined = new Uint8Array(chunkHashes.length * 32);
  for (let i = 0; i < chunkHashes.length; i++) {
    combined.set(chunkHashes[i], i * 32);
  }
  return verificationHasher.reset().update(combined).finalize(32);
}

// src/vendor/hfjs-xet/utils/createXorbs.ts
var TARGET_CHUNK_SIZE2 = 64 * 1024;
var MAX_CHUNK_SIZE = 2 * TARGET_CHUNK_SIZE2;
var XORB_SIZE = 64 * 1024 * 1024;
var MAX_XORB_CHUNKS = 8 * 1024;
var INTERVAL_BETWEEN_REMOTE_DEDUP = 4e6;
var PROCESSING_PROGRESS_RATIO = 0.1;
var UPLOADING_PROGRESS_RATIO = 1 - PROCESSING_PROGRESS_RATIO;
function computeXorbHashHex(chunks) {
  const chunkObjs = chunks.map((c) => ({ hash: hexToBytes(c.hash), length: c.length }));
  return hashToHex(xorbHash(chunkObjs));
}
function computeHmacHex(hash3, key) {
  return hashToHex(hmac(hexToBytes(hash3), hexToBytes(key)));
}
function computeVerificationHashHex(hashes) {
  return hashToHex(verificationHash(hashes.map(hexToBytes)));
}
function computeFileHashHex(chunks) {
  const chunkObjs = chunks.map((c) => ({ hash: hexToBytes(c.hash), length: c.length }));
  return hashToHex(fileHash(chunkObjs));
}
function addDataToChunker(data, chunker) {
  return nextBlock(chunker, data).map((c) => ({ hash: hashToHex(c.hash), length: c.length, dedup: false }));
}
function finalizeChunker(chunker) {
  const last = finalize(chunker);
  if (!last) {
    return [];
  }
  return [{ hash: hashToHex(last.hash), length: last.length, dedup: false }];
}
var CurrentXorbInfo = class {
  id;
  offset;
  chunks;
  fileProcessedBytes;
  fileUploadedBytes;
  fileSize;
  data;
  immutableData;
  constructor() {
    this.id = 0;
    this.offset = 0;
    this.chunks = [];
    this.fileProcessedBytes = {};
    this.fileUploadedBytes = {};
    this.fileSize = {};
    this.data = new Uint8Array(XORB_SIZE);
    this.immutableData = null;
  }
  event(computeXorbHash) {
    const xorbChunksCleaned = this.chunks.map((chunk) => ({
      hash: chunk.hash,
      length: chunk.length
    }));
    return {
      event: "xorb",
      xorb: this.data.subarray(0, this.offset),
      hash: computeXorbHash(xorbChunksCleaned),
      chunks: xorbChunksCleaned,
      id: this.id,
      files: Object.entries(this.fileProcessedBytes).map(([path4, processedBytes]) => ({
        path: path4,
        progress: processedBytes / this.fileSize[path4],
        lastSentProgress: ((this.fileUploadedBytes[path4] ?? 0) + (processedBytes - (this.fileUploadedBytes[path4] ?? 0)) * PROCESSING_PROGRESS_RATIO) / this.fileSize[path4]
      }))
    };
  }
};
async function* createXorbs(fileSources, params) {
  const alreadyDoneFileSha256s = /* @__PURE__ */ new Set();
  let xorbId = 0;
  const chunkCache = new ChunkCache();
  let xorb = new CurrentXorbInfo();
  const nextXorb = (currentFile) => {
    const event = xorb.event(computeXorbHashHex);
    xorbId++;
    xorb = new CurrentXorbInfo();
    xorb.id = xorbId;
    xorb.fileUploadedBytes = {
      [currentFile.path]: currentFile.uploadedBytes
    };
    xorb.fileSize[currentFile.path] = currentFile.size;
    return event;
  };
  const pendingFileEvents = [];
  const remoteXorbHashes = [""];
  for await (const fileSource of fileSources) {
    params.yieldCallback?.({
      event: "fileProgress",
      path: fileSource.path,
      progress: 0
    });
    if (fileSource.sha256 && alreadyDoneFileSha256s.has(fileSource.sha256)) {
      params.yieldCallback?.({
        event: "fileProgress",
        path: fileSource.path,
        progress: 1
      });
      continue;
    }
    if (fileSource.sha256) {
      alreadyDoneFileSha256s.add(fileSource.sha256);
    }
    const chunker = createChunker(TARGET_CHUNK_SIZE2);
    {
      xorb.fileSize[fileSource.path] = fileSource.content.size;
      if (fileSource.content instanceof SplicedBlob && fileSource.content.firstSpliceIndex < MAX_CHUNK_SIZE) {
        await loadDedupInfoToCache(
          fileSource.content.originalBlob.slice(0, MAX_CHUNK_SIZE),
          remoteXorbHashes,
          params,
          chunkCache,
          computeHmacHex,
          {
            maxChunks: 1,
            isAtBeginning: true
          }
        );
      }
      let bytesSinceRemoteDedup = Infinity;
      let bytesSinceLastProgressEvent = 0;
      let isFirstFileChunk = true;
      const sourceChunks = [];
      const reader = fileSource.content.stream().getReader();
      let processedBytes = 0;
      let dedupedBytes = 0;
      const fileChunks = [];
      const chunkMetadata = [];
      const addChunks = async function* (chunks) {
        for (const chunk of chunks) {
          if (isFirstFileChunk) {
            chunk.dedup = true;
            isFirstFileChunk = false;
          }
          let chunkIndex = xorb.chunks.length;
          let chunkXorbId = xorbId;
          const chunkToCopy = removeChunkFromSourceData(sourceChunks, chunk.length);
          let cacheData = chunkCache.getChunk(chunk.hash, computeHmacHex);
          if (cacheData === void 0 && chunk.dedup && bytesSinceRemoteDedup >= INTERVAL_BETWEEN_REMOTE_DEDUP) {
            const token = await xetWriteToken(params);
            bytesSinceRemoteDedup = 0;
            const shardResp = await (params.fetch ?? fetch)(token.casUrl + "/v1/chunks/default/" + chunk.hash, {
              headers: {
                Authorization: `Bearer ${token.accessToken}`
              }
            });
            if (shardResp.ok) {
              const shard = await shardResp.blob();
              const shardData = await parseShardData(shard);
              for (const xorb2 of shardData.xorbs) {
                const remoteXorbId = -remoteXorbHashes.length;
                remoteXorbHashes.push(xorb2.hash);
                let i = 0;
                for (const chunk2 of xorb2.chunks) {
                  chunkCache.addChunkToCache(chunk2.hash, remoteXorbId, i++, shardData.hmacKey);
                }
              }
              cacheData = chunkCache.getChunk(chunk.hash, computeHmacHex);
              const oldDedupedBytes = dedupedBytes;
              dedupedBytes = backtrackDedup(xorb, computeHmacHex, shardData, chunkCache, chunkMetadata, dedupedBytes);
              if (dedupedBytes > oldDedupedBytes) {
                xorb.fileUploadedBytes[fileSource.path] ??= 0;
                xorb.fileUploadedBytes[fileSource.path] += dedupedBytes - oldDedupedBytes;
              }
            }
          }
          if (cacheData === void 0) {
            if (!writeChunk(xorb, chunkToCopy, chunk.hash)) {
              yield nextXorb({ path: fileSource.path, uploadedBytes: processedBytes, size: fileSource.content.size });
              chunkIndex = 0;
              chunkXorbId = xorbId;
              for (const event of pendingFileEvents) {
                event.representation = event.representation.map((rep) => ({
                  ...rep,
                  xorbId: rep.xorbId >= 0 ? rep.xorbId : remoteXorbHashes[-rep.xorbId]
                }));
                yield event;
              }
              pendingFileEvents.length = 0;
              if (!writeChunk(xorb, chunkToCopy, chunk.hash)) {
                throw new Error("Failed to write chunk into xorb");
              }
            }
            chunkCache.addChunkToCache(chunk.hash, xorbId, chunkIndex, null);
          } else {
            chunkXorbId = cacheData.xorbIndex;
            chunkIndex = cacheData.chunkIndex;
            dedupedBytes += chunk.length;
            xorb.fileUploadedBytes[fileSource.path] ??= 0;
            xorb.fileUploadedBytes[fileSource.path] += chunk.length;
          }
          bytesSinceRemoteDedup += chunk.length;
          bytesSinceLastProgressEvent += chunk.length;
          fileChunks.push({ hash: chunk.hash, length: chunk.length });
          chunkMetadata.push({
            xorbId: chunkXorbId,
            chunkIndex,
            length: chunk.length
          });
          xorb.fileProcessedBytes[fileSource.path] = processedBytes;
          if (bytesSinceLastProgressEvent >= 1e6) {
            bytesSinceLastProgressEvent = 0;
            params.yieldCallback?.({
              event: "fileProgress",
              path: fileSource.path,
              progress: ((xorb.fileUploadedBytes[fileSource.path] ?? 0) + (xorb.fileProcessedBytes[fileSource.path] - (xorb.fileUploadedBytes[fileSource.path] ?? 0)) * PROCESSING_PROGRESS_RATIO) / fileSource.content.size
            });
          }
          if (xorb.chunks.length >= MAX_XORB_CHUNKS) {
            yield nextXorb({ path: fileSource.path, uploadedBytes: processedBytes, size: fileSource.content.size });
            for (const event of pendingFileEvents) {
              event.representation = event.representation.map((rep) => ({
                ...rep,
                xorbId: rep.xorbId >= 0 ? rep.xorbId : remoteXorbHashes[-rep.xorbId]
              }));
              yield event;
            }
            pendingFileEvents.length = 0;
          }
        }
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          yield* addChunks(finalizeChunker(chunker));
          break;
        }
        processedBytes += value.length;
        sourceChunks.push(value);
        yield* addChunks(addDataToChunker(value, chunker));
      }
      const fileRepresentation = buildFileRepresentation(chunkMetadata, fileChunks, computeVerificationHashHex);
      xorb.immutableData = {
        chunkIndex: xorb.chunks.length,
        offset: xorb.offset
      };
      const dedupRatio = fileSource.content.size > 0 ? dedupedBytes / fileSource.content.size : 0;
      pendingFileEvents.push({
        event: "file",
        path: fileSource.path,
        hash: computeFileHashHex(fileChunks),
        sha256: fileSource.sha256,
        dedupRatio,
        representation: fileRepresentation
      });
    }
  }
  if (xorb.offset > 0) {
    yield xorb.event(computeXorbHashHex);
  }
  for (const event of pendingFileEvents) {
    event.representation = event.representation.map((rep) => ({
      ...rep,
      xorbId: rep.xorbId >= 0 ? rep.xorbId : remoteXorbHashes[-rep.xorbId]
    }));
    yield event;
  }
}
function backtrackDedup(xorb, computeHmac, shardData, chunkCache, chunkMetadata, dedupedBytes) {
  const chunkIndexesToBacktrackFor = /* @__PURE__ */ new Map();
  for (let chunkToRecheckIndex = xorb.immutableData?.chunkIndex ?? 0; chunkToRecheckIndex < xorb.chunks.length; chunkToRecheckIndex++) {
    const chunk = xorb.chunks[chunkToRecheckIndex];
    const hmacHash = computeHmac(chunk.hash, shardData.hmacKey);
    const cacheData = chunkCache.getChunk(hmacHash, null);
    if (cacheData !== void 0) {
      chunkIndexesToBacktrackFor.set(chunkToRecheckIndex, {
        xorbId: cacheData.xorbIndex,
        chunkIndex: cacheData.chunkIndex
      });
      chunkCache.removeChunkFromCache(chunk.hash);
    }
  }
  for (const metadata of chunkMetadata) {
    if (metadata.xorbId === xorb.id && chunkIndexesToBacktrackFor.has(metadata.chunkIndex)) {
      const backtrackData = chunkIndexesToBacktrackFor.get(metadata.chunkIndex);
      if (backtrackData !== void 0) {
        metadata.xorbId = backtrackData.xorbId;
        metadata.chunkIndex = backtrackData.chunkIndex;
        dedupedBytes += metadata.length;
      }
    }
  }
  const xorbRangesToErase = [];
  for (let i = 0; i < xorb.chunks.length; i++) {
    const chunk = xorb.chunks[i];
    if (chunkIndexesToBacktrackFor.has(i)) {
      xorbRangesToErase.push({
        start: chunk.offset,
        end: i < xorb.chunks.length - 1 ? xorb.chunks[i + 1].offset : xorb.offset
      });
    }
  }
  const xorbRangesToKeep = [];
  let currentStart = 0;
  for (let i = 0; i < xorbRangesToErase.length; i++) {
    const range = xorbRangesToErase[i];
    if (currentStart !== range.start) {
      xorbRangesToKeep.push({ start: currentStart, end: range.start });
    }
    currentStart = range.end;
  }
  if (currentStart !== xorb.offset) {
    xorbRangesToKeep.push({ start: currentStart, end: xorb.offset });
  }
  let currentOffset = 0;
  for (const range of xorbRangesToKeep) {
    if (range.start !== currentOffset) {
      xorb.data.set(xorb.data.subarray(range.start, range.end), currentOffset);
    }
    currentOffset += range.end - range.start;
  }
  const newXorbChunks = [];
  const oldIndexToNewIndex = /* @__PURE__ */ new Map();
  let erasedOffset = 0;
  for (let i = 0; i < xorb.chunks.length; i++) {
    const chunk = xorb.chunks[i];
    if (chunkIndexesToBacktrackFor.has(i)) {
      if (i < xorb.chunks.length - 1) {
        erasedOffset += xorb.chunks[i + 1].offset - chunk.offset;
      }
    } else {
      newXorbChunks.push({
        hash: chunk.hash,
        length: chunk.length,
        offset: chunk.offset - erasedOffset
      });
      if (erasedOffset > 0) {
        oldIndexToNewIndex.set(i, newXorbChunks.length - 1);
      }
    }
  }
  xorb.chunks = newXorbChunks;
  xorb.offset = currentOffset;
  for (const chunk of chunkMetadata) {
    if (chunk.xorbId === xorb.id) {
      const newIndex = oldIndexToNewIndex.get(chunk.chunkIndex);
      if (newIndex !== void 0) {
        const cached = chunkCache.getChunk(xorb.chunks[newIndex].hash, null);
        if (cached !== void 0 && cached.xorbIndex === chunk.xorbId && cached.chunkIndex === chunk.chunkIndex) {
          chunkCache.updateChunkIndex(xorb.chunks[newIndex].hash, newIndex);
        }
        chunk.chunkIndex = newIndex;
      }
    }
  }
  return dedupedBytes;
}
function removeChunkFromSourceData(sourceChunks, chunkLength) {
  if (chunkLength === sourceChunks[0].length) {
    const chunkToCopy = sourceChunks[0];
    sourceChunks.shift();
    return chunkToCopy;
  } else if (chunkLength < sourceChunks[0].length) {
    const chunkToCopy = sourceChunks[0].subarray(0, chunkLength);
    sourceChunks[0] = sourceChunks[0].subarray(chunkLength);
    return chunkToCopy;
  } else {
    const chunkToCopy = new Uint8Array(chunkLength);
    let copyOffset = 0;
    let index = 0;
    let toSlice = -1;
    while (copyOffset < chunkLength) {
      const nToCopy = Math.min(sourceChunks[index].length, chunkLength - copyOffset);
      chunkToCopy.set(sourceChunks[index].subarray(0, nToCopy), copyOffset);
      copyOffset += nToCopy;
      if (nToCopy === sourceChunks[index].length) {
        index++;
      } else {
        toSlice = nToCopy;
      }
    }
    sourceChunks.splice(0, index);
    if (toSlice !== -1) {
      sourceChunks[0] = sourceChunks[0].subarray(toSlice);
    }
    return chunkToCopy;
  }
}
function writeChunk(xorb, chunk, hash3) {
  const regularCompressedChunk = compress(chunk);
  const bgCompressedChunk = compress(bg4_split_bytes(chunk));
  const compressedChunk = bgCompressedChunk.length < regularCompressedChunk.length ? bgCompressedChunk : regularCompressedChunk;
  const chunkToWrite = compressedChunk.length < chunk.length ? compressedChunk : chunk;
  if (xorb.offset + XET_CHUNK_HEADER_BYTES + chunkToWrite.length > XORB_SIZE) {
    return false;
  }
  xorb.data[xorb.offset] = 0;
  xorb.data[xorb.offset + 1] = chunkToWrite.length & 255;
  xorb.data[xorb.offset + 2] = chunkToWrite.length >> 8 & 255;
  xorb.data[xorb.offset + 3] = chunkToWrite.length >> 16 & 255;
  xorb.data[xorb.offset + 4] = chunkToWrite.length < chunk.length ? bgCompressedChunk.length < regularCompressedChunk.length ? 2 /* ByteGroupingLZ4 */ : 1 /* LZ4 */ : 0 /* None */;
  xorb.data[xorb.offset + 5] = chunk.length & 255;
  xorb.data[xorb.offset + 6] = chunk.length >> 8 & 255;
  xorb.data[xorb.offset + 7] = chunk.length >> 16 & 255;
  xorb.data.set(chunkToWrite, xorb.offset + XET_CHUNK_HEADER_BYTES);
  xorb.chunks.push({ hash: hash3, length: chunk.length, offset: xorb.offset });
  xorb.offset += XET_CHUNK_HEADER_BYTES + chunkToWrite.length;
  return true;
}
var buildFileRepresentation = (metadata, chunks, computeVerificationHash) => {
  if (metadata.length === 0) {
    return [];
  }
  const representation = [];
  let currentRange = {
    xorbId: metadata[0].xorbId,
    indexStart: metadata[0].chunkIndex,
    indexEnd: metadata[0].chunkIndex + 1,
    length: metadata[0].length,
    chunkHashStart: 0
  };
  for (let i = 1; i < metadata.length; i++) {
    const chunk = metadata[i];
    if (currentRange.xorbId === chunk.xorbId && currentRange.indexEnd === chunk.chunkIndex) {
      currentRange.indexEnd = chunk.chunkIndex + 1;
      currentRange.length += chunk.length;
    } else {
      const rangeHash2 = computeVerificationHash(chunks.slice(currentRange.chunkHashStart, i).map((x3) => x3.hash));
      representation.push({
        xorbId: currentRange.xorbId,
        indexStart: currentRange.indexStart,
        indexEnd: currentRange.indexEnd,
        length: currentRange.length,
        rangeHash: rangeHash2
      });
      currentRange = {
        xorbId: chunk.xorbId,
        indexStart: chunk.chunkIndex,
        indexEnd: chunk.chunkIndex + 1,
        length: chunk.length,
        chunkHashStart: i
      };
    }
  }
  const rangeHash = computeVerificationHash(chunks.slice(currentRange.chunkHashStart).map((x3) => x3.hash));
  representation.push({
    xorbId: currentRange.xorbId,
    indexStart: currentRange.indexStart,
    indexEnd: currentRange.indexEnd,
    length: currentRange.length,
    rangeHash
  });
  return representation;
};
async function loadDedupInfoToCache(content, remoteXorbHashes, params, chunkCache, computeHmacHex2, opts) {
  const chunker = createChunker(TARGET_CHUNK_SIZE2);
  const cache = chunkCache;
  let dedupedBytes = 0;
  let chunksProcessed = 0;
  let totalBytes = 0;
  let bytesSinceRemoteDedup = Infinity;
  const sourceChunks = [];
  const reader = content.stream().getReader();
  const processChunks = async (chunks) => {
    for (const chunk of chunks) {
      chunksProcessed++;
      if (opts?.isAtBeginning && chunksProcessed === 1) {
        chunk.dedup = true;
      }
      totalBytes += chunk.length;
      removeChunkFromSourceData(sourceChunks, chunk.length);
      let cacheData = cache.getChunk(chunk.hash, computeHmacHex2);
      if (cacheData !== void 0) {
        dedupedBytes += chunk.length;
        bytesSinceRemoteDedup += chunk.length;
        continue;
      }
      if (chunk.dedup && bytesSinceRemoteDedup >= INTERVAL_BETWEEN_REMOTE_DEDUP) {
        const token = await xetWriteToken(params);
        bytesSinceRemoteDedup = 0;
        const shardResp = await (params.fetch ?? fetch)(token.casUrl + "/v1/chunks/default/" + chunk.hash, {
          headers: {
            Authorization: `Bearer ${token.accessToken}`
          }
        });
        if (shardResp.ok) {
          const shard = await shardResp.blob();
          const shardData = await parseShardData(shard);
          for (const xorb of shardData.xorbs) {
            const remoteXorbId = -remoteXorbHashes.length;
            remoteXorbHashes.push(xorb.hash);
            let i = 0;
            for (const xorbChunk of xorb.chunks) {
              cache.addChunkToCache(xorbChunk.hash, remoteXorbId, i++, shardData.hmacKey);
            }
          }
          cacheData = cache.getChunk(chunk.hash, computeHmacHex2);
        }
      }
      if (cacheData !== void 0) {
        dedupedBytes += chunk.length;
      }
      bytesSinceRemoteDedup += chunk.length;
    }
  };
  while (true) {
    if (opts?.end !== void 0 && totalBytes >= opts.end) {
      break;
    }
    if (opts?.maxChunks !== void 0 && chunksProcessed >= opts.maxChunks) {
      break;
    }
    const { done, value } = await reader.read();
    if (done) {
      await processChunks(finalizeChunker(chunker));
      break;
    }
    sourceChunks.push(value);
    await processChunks(addDataToChunker(value, chunker));
  }
}

// src/vendor/hfjs-xet/utils/uploadShards.ts
var SHARD_MAX_SIZE = 64 * 1024 * 1024;
var SHARD_HEADER_SIZE = 48;
var SHARD_FOOTER_SIZE = 200;
var HASH_LENGTH2 = 32;
var XORB_FOOTER_LENGTH = 48;
var FILE_FOOTER_LENGTH = 48;
var SHARD_HEADER_VERSION = 2n;
var SHARD_FOOTER_VERSION = 1n;
var MDB_FILE_FLAG_WITH_VERIFICATION = 2147483648;
var MDB_FILE_FLAG_WITH_METADATA_EXT = 1073741824;
var SHARD_MAGIC_TAG = new Uint8Array([
  "H".charCodeAt(0),
  "F".charCodeAt(0),
  "R".charCodeAt(0),
  "e".charCodeAt(0),
  "p".charCodeAt(0),
  "o".charCodeAt(0),
  "M".charCodeAt(0),
  "e".charCodeAt(0),
  "t".charCodeAt(0),
  "a".charCodeAt(0),
  "D".charCodeAt(0),
  "a".charCodeAt(0),
  "t".charCodeAt(0),
  "a".charCodeAt(0),
  0,
  85,
  105,
  103,
  69,
  106,
  123,
  129,
  87,
  131,
  165,
  189,
  217,
  92,
  205,
  209,
  74,
  169
]);
async function* uploadShards(source, params) {
  const xorbHashes = [];
  const seenFileXetHashes = /* @__PURE__ */ new Set();
  const fileInfoSection = new Uint8Array(Math.floor(SHARD_MAX_SIZE - SHARD_HEADER_SIZE - SHARD_FOOTER_SIZE) * 0.25);
  const xorbInfoSection = new Uint8Array(Math.floor(SHARD_MAX_SIZE - SHARD_HEADER_SIZE - SHARD_FOOTER_SIZE) * 0.75);
  const xorbView = new DataView(xorbInfoSection.buffer);
  let xorbViewOffset = 0;
  const fileInfoView = new DataView(fileInfoSection.buffer);
  let fileViewOffset = 0;
  let xorbTotalSize = 0n;
  let fileTotalSize = 0n;
  let xorbTotalUnpackedSize = 0n;
  for await (const output of createXorbs(source, params)) {
    switch (output.event) {
      case "xorb": {
        xorbHashes.push(output.hash);
        const xorbEntrySize = HASH_LENGTH2 + 4 + 4 + 4 + 4;
        const chunksSize = output.chunks.length * (HASH_LENGTH2 + 4 + 4 + 8);
        const totalXorbSize = xorbEntrySize + chunksSize;
        if (xorbViewOffset + totalXorbSize > xorbInfoSection.length) {
          if (xorbViewOffset > 0 || fileViewOffset > 0) {
            await uploadShard(createShard(), params);
          }
        }
        writeHashToArray(output.hash, xorbInfoSection, xorbViewOffset);
        xorbViewOffset += HASH_LENGTH2;
        xorbView.setUint32(xorbViewOffset, 0, true);
        xorbViewOffset += 4;
        xorbView.setUint32(xorbViewOffset, output.chunks.length, true);
        xorbViewOffset += 4;
        const xorbUnpackedSize = sum(output.chunks.map((x3) => x3.length));
        xorbView.setUint32(xorbViewOffset, xorbUnpackedSize, true);
        xorbTotalUnpackedSize += BigInt(xorbUnpackedSize);
        xorbTotalSize += BigInt(output.xorb.byteLength);
        xorbViewOffset += 4;
        xorbView.setUint32(xorbViewOffset, output.xorb.byteLength, true);
        xorbViewOffset += 4;
        let chunkBytes = 0;
        for (const chunk of output.chunks) {
          writeHashToArray(chunk.hash, xorbInfoSection, xorbViewOffset);
          xorbViewOffset += HASH_LENGTH2;
          xorbView.setUint32(xorbViewOffset, chunkBytes, true);
          xorbViewOffset += 4;
          xorbView.setUint32(xorbViewOffset, chunk.length, true);
          xorbViewOffset += 4;
          xorbView.setBigUint64(xorbViewOffset, 0n, true);
          xorbViewOffset += 8;
          chunkBytes += chunk.length;
        }
        for (const file of output.files) {
          yield {
            event: "fileProgress",
            path: file.path,
            progress: file.lastSentProgress
          };
        }
        await uploadXorb(output, params);
        for (const file of output.files) {
          yield { event: "fileProgress", path: file.path, progress: file.progress };
        }
        break;
      }
      case "file": {
        yield {
          event: "file",
          path: output.path,
          xetHash: output.hash,
          sha256: output.sha256,
          dedupRatio: output.dedupRatio
        };
        if (seenFileXetHashes.has(output.hash)) {
          break;
        }
        seenFileXetHashes.add(output.hash);
        const fileHeaderSize = HASH_LENGTH2 + 4 + 4 + 8;
        const representationSize = output.representation.length * (HASH_LENGTH2 + 4 + 4 + 4 + 4);
        const verificationSize = output.representation.length * (HASH_LENGTH2 + 16);
        const fileSha256 = output.sha256;
        const hasMetadataExt = fileSha256 !== void 0;
        const metadataSize = hasMetadataExt ? HASH_LENGTH2 + 16 : 0;
        const totalFileSize = fileHeaderSize + representationSize + verificationSize + metadataSize;
        if (fileViewOffset + totalFileSize > fileInfoSection.length) {
          if (xorbViewOffset > 0 || fileViewOffset > 0) {
            await uploadShard(createShard(), params);
          }
        }
        writeHashToArray(output.hash, fileInfoSection, fileViewOffset);
        fileViewOffset += HASH_LENGTH2;
        fileInfoView.setUint32(
          fileViewOffset,
          MDB_FILE_FLAG_WITH_VERIFICATION + (hasMetadataExt ? MDB_FILE_FLAG_WITH_METADATA_EXT : 0),
          true
        );
        fileViewOffset += 4;
        fileInfoView.setUint32(fileViewOffset, output.representation.length, true);
        fileViewOffset += 4;
        fileInfoView.setBigUint64(fileViewOffset, 0n, true);
        fileViewOffset += 8;
        for (const repItem of output.representation) {
          writeHashToArray(
            typeof repItem.xorbId === "number" ? xorbHashes[repItem.xorbId] : repItem.xorbId,
            fileInfoSection,
            fileViewOffset
          );
          fileViewOffset += HASH_LENGTH2;
          fileInfoView.setUint32(fileViewOffset, 0, true);
          fileViewOffset += 4;
          fileInfoView.setUint32(fileViewOffset, repItem.length, true);
          fileViewOffset += 4;
          fileInfoView.setUint32(fileViewOffset, repItem.indexStart, true);
          fileViewOffset += 4;
          fileInfoView.setUint32(fileViewOffset, repItem.indexEnd, true);
          fileViewOffset += 4;
        }
        for (const repItem of output.representation) {
          writeHashToArray(repItem.rangeHash, fileInfoSection, fileViewOffset);
          fileViewOffset += HASH_LENGTH2;
          for (let i = 0; i < 16; i++) {
            fileInfoSection[fileViewOffset + i] = 0;
          }
          fileViewOffset += 16;
        }
        if (hasMetadataExt) {
          writeHashToArray(fileSha256, fileInfoSection, fileViewOffset);
          fileViewOffset += HASH_LENGTH2;
          for (let i = 0; i < 16; i++) {
            fileInfoSection[fileViewOffset + i] = 0;
          }
          fileViewOffset += 16;
        }
        break;
      }
    }
  }
  function createShard() {
    const shard = new Uint8Array(
      SHARD_HEADER_SIZE + SHARD_FOOTER_SIZE + xorbViewOffset + XORB_FOOTER_LENGTH + fileViewOffset + FILE_FOOTER_LENGTH
    );
    const shardView = new DataView(shard.buffer);
    let shardOffset = 0;
    shard.set(SHARD_MAGIC_TAG, shardOffset);
    shardOffset += SHARD_MAGIC_TAG.length;
    shardView.setBigUint64(shardOffset, SHARD_HEADER_VERSION, true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, BigInt(SHARD_FOOTER_SIZE), true);
    shardOffset += 8;
    shard.set(fileInfoSection.slice(0, fileViewOffset), shardOffset);
    shardOffset += fileViewOffset;
    for (let i = 0; i < 32; i++) {
      shard[shardOffset + i] = 255;
    }
    shardOffset += 32;
    for (let i = 0; i < 16; i++) {
      shard[shardOffset + i] = 0;
    }
    shardOffset += 16;
    const xorbInfoOffset = shardOffset;
    shard.set(xorbInfoSection.slice(0, xorbViewOffset), shardOffset);
    shardOffset += xorbViewOffset;
    for (let i = 0; i < 32; i++) {
      shard[shardOffset + i] = 255;
    }
    shardOffset += 32;
    for (let i = 0; i < 16; i++) {
      shard[shardOffset + i] = 0;
    }
    shardOffset += 16;
    const footerOffset = shardOffset;
    shardView.setBigUint64(shardOffset, SHARD_FOOTER_VERSION, true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, BigInt(SHARD_HEADER_SIZE), true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, BigInt(xorbInfoOffset), true);
    shardOffset += 8;
    for (let i = 0; i < 48; i++) {
      shardView.setUint8(shardOffset + i, 0);
    }
    shardOffset += 48;
    for (let i = 0; i < 32; i++) {
      shardView.setUint8(shardOffset + i, 0);
    }
    shardOffset += 32;
    shardView.setBigUint64(shardOffset, BigInt(Math.floor(Date.now() / 1e3)), true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, 0n, true);
    shardOffset += 8;
    for (let i = 0; i < 48; i++) {
      shardView.setUint8(shardOffset + i, 0);
    }
    shardOffset += 48;
    shardView.setBigUint64(shardOffset, xorbTotalSize, true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, fileTotalSize, true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, xorbTotalUnpackedSize, true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, BigInt(footerOffset), true);
    xorbViewOffset = 0;
    fileViewOffset = 0;
    xorbTotalSize = 0n;
    xorbTotalUnpackedSize = 0n;
    fileTotalSize = 0n;
    return shard;
  }
  if (xorbViewOffset || fileViewOffset) {
    await uploadShard(createShard(), params);
  }
}
function writeHashToArray(hash3, array, offset) {
  for (let i = 0; i < hash3.length; i += 16) {
    array[offset + i / 2] = parseInt(hash3.substring(i + 2 * 7, i + 2 * 8), 16);
    array[offset + i / 2 + 1] = parseInt(hash3.substring(i + 2 * 6, i + 2 * 7), 16);
    array[offset + i / 2 + 2] = parseInt(hash3.substring(i + 2 * 5, i + 2 * 6), 16);
    array[offset + i / 2 + 3] = parseInt(hash3.substring(i + 2 * 4, i + 2 * 5), 16);
    array[offset + i / 2 + 4] = parseInt(hash3.substring(i + 2 * 3, i + 2 * 4), 16);
    array[offset + i / 2 + 5] = parseInt(hash3.substring(i + 2 * 2, i + 2 * 3), 16);
    array[offset + i / 2 + 6] = parseInt(hash3.substring(i + 2 * 1, i + 2 * 2), 16);
    array[offset + i / 2 + 7] = parseInt(hash3.substring(i + 2 * 0, i + 2 * 1), 16);
  }
}
async function uploadXorb(xorb, params) {
  const token = await xetWriteToken(params);
  const resp = await (params.fetch ?? fetch)(`${token.casUrl}/v1/xorbs/default/${xorb.hash}`, {
    method: "POST",
    body: xorb.xorb,
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      ...params.xetParams.sessionId ? { "X-Xet-Session-Id": params.xetParams.sessionId } : {}
    },
    ...{
      progressHint: {
        progressCallback: (progress) => {
          for (const file of xorb.files) {
            params.yieldCallback?.({
              event: "fileProgress",
              path: file.path,
              progress: file.lastSentProgress + (file.progress - file.lastSentProgress) * progress
            });
          }
        }
      }
    }
  });
  if (!resp.ok) {
    throw await createApiError(resp);
  }
}
async function uploadShard(shard, params) {
  const token = await xetWriteToken(params);
  const resp = await (params.fetch ?? fetch)(`${token.casUrl}/v1/shards`, {
    method: "POST",
    body: shard,
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      ...params.xetParams.sessionId ? { "X-Xet-Session-Id": params.xetParams.sessionId } : {}
    }
  });
  if (!resp.ok) {
    throw await createApiError(resp);
  }
}

// src/hf-bucket-client/client.ts
var HUB_URL = "https://huggingface.co";
var RETRY_STATUSES = /* @__PURE__ */ new Set([408, 429, 500, 502, 503, 504]);
var REQUEST_TIMEOUT_MS = 3e4;
function nextPageUrl(linkHeader) {
  if (!linkHeader) {
    return null;
  }
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}
var BucketHttpError = class extends Error {
  constructor(status, url, body) {
    super(`bucket request failed: ${status} ${url}: ${body.slice(0, 500)}`);
    this.status = status;
    this.url = url;
    this.name = "BucketHttpError";
  }
};
var BucketClient = class {
  bucket;
  hubUrl;
  accessToken;
  fetchImpl;
  constructor(options) {
    this.bucket = options.bucket;
    this.hubUrl = options.hubUrl ?? HUB_URL;
    this.accessToken = options.accessToken;
    this.fetchImpl = options.fetch ?? fetch;
  }
  apiUrl(suffix) {
    return `${this.hubUrl}/api/buckets/${this.bucket}${suffix}`;
  }
  authHeaders() {
    return { Authorization: `Bearer ${this.accessToken}` };
  }
  async request(url, init) {
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      throw new BucketHttpError(response.status, url, await response.text());
    }
    return response;
  }
  async fetchWithRetry(url, init) {
    const attempts = 4;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      let response;
      try {
        response = await this.fetchImpl(url, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: { ...this.authHeaders(), ...init?.headers }
        });
      } catch (err) {
        if (attempt < attempts - 1 && err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
          await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
          continue;
        }
        throw err;
      }
      if (!RETRY_STATUSES.has(response.status) || attempt === attempts - 1) {
        return response;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
    throw new Error("unreachable retry state");
  }
  /** Upload file contents via Xet, then register them in one batch call. */
  async uploadFiles(files) {
    if (files.length === 0) {
      return;
    }
    const hashes = /* @__PURE__ */ new Map();
    const source = (async function* () {
      for (const file of files) {
        yield { content: file.content, path: file.path };
      }
    })();
    for await (const event of uploadShards(source, {
      accessToken: this.accessToken,
      hubUrl: this.hubUrl,
      // All upload traffic goes to the CAS endpoint from the write token;
      // repo/rev are unused by the network path for buckets.
      repo: { type: "model", name: this.bucket },
      rev: "main",
      xetParams: {
        refreshWriteTokenUrl: this.apiUrl("/xet-write-token")
      },
      fetch: this.fetchImpl
    })) {
      if (event.event === "file") {
        hashes.set(event.path, event.xetHash);
      }
    }
    const missing = files.filter((file) => !hashes.has(file.path));
    if (missing.length > 0) {
      throw new Error(`xet upload returned no hash for: ${missing.map((f) => f.path).join(", ")}`);
    }
    await this.batch(
      files.map((file) => ({
        type: "addFile",
        path: file.path,
        xetHash: hashes.get(file.path),
        // Milliseconds, per the Python reference (`int(time.time() * 1000)`).
        mtime: Date.now()
      }))
    );
  }
  async deleteFiles(paths) {
    if (paths.length === 0) {
      return;
    }
    await this.batch(paths.map((path4) => ({ type: "deleteFile", path: path4 })));
  }
  async batch(operations) {
    const body = `${operations.map((op) => JSON.stringify(op)).join("\n")}
`;
    await this.request(this.apiUrl("/batch"), {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson" },
      body
    });
  }
  /**
   * Download a file. Returns null when the file does not exist; throws on
   * any other failure (including bucket/auth errors), so a missing object is
   * never conflated with an unreachable bucket.
   */
  async downloadFile(path4) {
    const url = `${this.hubUrl}/buckets/${this.bucket}/resolve/${encodeURIComponent(path4)}`;
    const response = await this.fetchWithRetry(url);
    if (response.status === 404) {
      await this.assertBucketAccessible();
      return null;
    }
    if (!response.ok) {
      throw new BucketHttpError(response.status, url, await response.text());
    }
    return await response.blob();
  }
  /** List files under a prefix (recursive), following Link-header pagination. */
  async listFiles(prefix = "") {
    const entries = [];
    const encodedPrefix = prefix ? `/${encodeURIComponent(prefix)}` : "";
    let url = `${this.apiUrl(`/tree${encodedPrefix}`)}?recursive=true`;
    while (url) {
      const response = await this.request(url);
      const page = await response.json();
      for (const item of page) {
        entries.push({
          path: item.path,
          size: item.size ?? 0,
          type: item.type === "directory" ? "directory" : "file"
        });
      }
      url = nextPageUrl(response.headers.get("link"));
    }
    return entries;
  }
  async assertBucketAccessible() {
    await this.request(this.apiUrl(""));
  }
};

// src/hclaw/hub-api.ts
var HubApiError2 = class extends Error {
  constructor(status, url, body) {
    super(`Hub request failed: ${status} ${url}: ${body.slice(0, 500)}`);
    this.status = status;
    this.url = url;
    this.name = "HubApiError";
  }
};
var HubApi = class {
  hubUrl;
  token;
  fetchImpl;
  constructor(params) {
    this.token = params.token;
    this.hubUrl = params.hubUrl ?? HUB_URL;
    this.fetchImpl = params.fetch ?? fetch;
  }
  bucket(bucket) {
    return new BucketClient({ bucket, accessToken: this.token, hubUrl: this.hubUrl, fetch: this.fetchImpl });
  }
  async whoami() {
    return await this.requestJson("/api/whoami-v2");
  }
  async createBucket(bucketId, privateBucket = true) {
    const [namespace, name] = splitRepoId(bucketId);
    try {
      await this.requestJson(`/api/buckets/${namespace}/${name}`, {
        method: "POST",
        body: JSON.stringify({ private: privateBucket }),
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      if (err instanceof HubApiError2 && err.status === 409) {
        return;
      }
      throw err;
    }
  }
  async createDockerSpace(repoId, options) {
    const [owner, name] = splitRepoId(repoId);
    const me2 = await this.whoami();
    const payload = {
      name,
      organization: owner === me2.name ? null : owner,
      type: "space",
      sdk: "docker",
      private: options?.private !== false
    };
    if (options?.hardware) {
      payload.hardware = options.hardware;
    }
    if (typeof options?.sleepTimeSeconds === "number") {
      payload.sleepTimeSeconds = options.sleepTimeSeconds;
    }
    try {
      await this.requestJson("/api/repos/create", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      if (err instanceof HubApiError2 && err.status === 409) {
        return;
      }
      throw err;
    }
  }
  async addSpaceVariable(repoId, key, value) {
    await this.requestJson(`/api/spaces/${repoId}/variables`, {
      method: "POST",
      body: JSON.stringify({ key, value }),
      headers: { "Content-Type": "application/json" }
    });
  }
  async deleteSpaceVariable(repoId, key) {
    await this.requestJson(`/api/spaces/${repoId}/variables`, {
      method: "DELETE",
      body: JSON.stringify({ key }),
      headers: { "Content-Type": "application/json" }
    });
  }
  async getSpaceVariables(repoId) {
    const raw = await this.requestJson(`/api/spaces/${repoId}/variables`);
    return new Map(Object.entries(raw));
  }
  async addSpaceSecret(repoId, key, value) {
    await this.requestJson(`/api/spaces/${repoId}/secrets`, {
      method: "POST",
      body: JSON.stringify({ key, value }),
      headers: { "Content-Type": "application/json" }
    });
  }
  async getSpaceSecrets(repoId) {
    const raw = await this.requestJson(`/api/spaces/${repoId}/secrets`);
    return new Map(Object.entries(raw));
  }
  async restartSpace(repoId, factoryReboot = false) {
    await this.requestJson(`/api/spaces/${repoId}/restart`, {
      method: "POST",
      body: JSON.stringify({ factoryReboot }),
      headers: { "Content-Type": "application/json" }
    });
  }
  async pauseSpace(repoId) {
    return await this.requestJson(`/api/spaces/${repoId}/pause`, {
      method: "POST"
    });
  }
  async requestSpaceHardware(repoId, hardware, sleepTimeSeconds) {
    const payload = { flavor: hardware };
    if (typeof sleepTimeSeconds === "number") {
      payload.sleepTimeSeconds = sleepTimeSeconds;
    }
    return await this.requestJson(`/api/spaces/${repoId}/hardware`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" }
    });
  }
  async setSpaceSleepTime(repoId, seconds) {
    return await this.requestJson(`/api/spaces/${repoId}/sleeptime`, {
      method: "POST",
      body: JSON.stringify({ seconds }),
      headers: { "Content-Type": "application/json" }
    });
  }
  async getSpaceRuntime(repoId) {
    return await this.requestJson(`/api/spaces/${repoId}/runtime`);
  }
  async fetchSpaceLogs(repoId, kind = "run") {
    const url = `${this.hubUrl}/api/spaces/${repoId}/logs/${kind}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5e3);
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${this.token}`, Accept: "text/event-stream" },
      signal: controller.signal
    });
    if (!response.ok) {
      clearTimeout(timeout);
      throw new HubApiError2(response.status, url, await response.text());
    }
    const reader = response.body?.getReader();
    if (!reader) {
      clearTimeout(timeout);
      return "";
    }
    const decoder = new TextDecoder();
    let raw = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } catch (err) {
      if (!(err instanceof Error) || err.name !== "AbortError" && err.name !== "TimeoutError") {
        throw err;
      }
    } finally {
      clearTimeout(timeout);
    }
    return sseDataToText(raw);
  }
  async fetchSpaceLogsTextFallback(repoId, kind = "run") {
    const response = await this.request(`/api/spaces/${repoId}/logs/${kind}`, {
      headers: { Accept: "text/event-stream" },
      signal: AbortSignal.timeout(5e3)
    }, true);
    return sseDataToText(await response.text());
  }
  async listSpaceFiles(repoId) {
    const raw = await this.requestJson(`/api/spaces/${repoId}`);
    return (raw.siblings ?? []).map((sibling) => sibling.rfilename).filter((name) => typeof name === "string" && name.length > 0).sort();
  }
  async commitSpaceFiles(repoId, params) {
    const body = [
      {
        key: "header",
        value: {
          summary: params.title,
          description: params.description
        }
      },
      ...params.files.map((file) => ({
        key: "file",
        value: {
          path: file.path,
          content: Buffer.from(file.content).toString("base64"),
          encoding: "base64"
        }
      })),
      ...(params.deletePaths ?? []).map((path4) => ({
        key: "deletedFile",
        value: { path: path4 }
      }))
    ].map((entry) => JSON.stringify(entry)).join("\n");
    await this.request(`/api/spaces/${repoId}/commit/${encodeURIComponent(params.branch ?? "main")}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson" },
      body
    });
  }
  async assertBucketAccessible(bucketId) {
    try {
      await this.bucket(bucketId).assertBucketAccessible();
    } catch (err) {
      if (err instanceof BucketHttpError) {
        throw new Error(`bucket ${bucketId} is not accessible: ${err.message}`);
      }
      throw err;
    }
  }
  async requestJson(pathOrUrl, init) {
    const response = await this.request(pathOrUrl, init);
    return await response.json();
  }
  async request(pathOrUrl, init, tolerateAbort = false) {
    const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${this.hubUrl}${pathOrUrl}`;
    let response;
    try {
      response = await this.fetchImpl(url, {
        ...init,
        headers: { Authorization: `Bearer ${this.token}`, ...init?.headers }
      });
    } catch (err) {
      if (tolerateAbort && err instanceof Error && err.name === "TimeoutError") {
        throw err;
      }
      throw err;
    }
    if (!response.ok) {
      throw new HubApiError2(response.status, url, await response.text());
    }
    return response;
  }
};
function splitRepoId(repoId) {
  const parts = repoId.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`expected repo id as owner/name, got ${repoId}`);
  }
  return [parts[0], parts[1]];
}
function sseDataToText(raw) {
  const lines = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) {
      continue;
    }
    const data = line.slice("data:".length).trim();
    if (!data || !data.startsWith("{")) {
      continue;
    }
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed.data === "string") {
        lines.push(parsed.data);
      }
    } catch {
    }
  }
  return lines.join("");
}

// src/hclaw/runtime-image.ts
var DEFAULT_RUNTIME_IMAGE = "ghcr.io/osolmaz/huggingclaw-runtime:latest";
function resolveRuntimeImage(value, env = process.env) {
  return value?.trim() || env.HUGGINGCLAW_RUNTIME_IMAGE?.trim() || DEFAULT_RUNTIME_IMAGE;
}

// src/hclaw/git.ts
var execFileAsync2 = promisify2(execFile2);
async function pushTemplateToSpace(params) {
  const tempRoot = await fs2.mkdtemp(path2.join(os2.tmpdir(), "hclaw-space-"));
  try {
    const sourceDir = params.sourceDir ?? process.env.HCLAW_SOURCE_DIR ?? await findPackagedSourceRoot();
    const templateRev = await currentTemplateRev(sourceDir);
    const outDir = path2.join(tempRoot, "space");
    await fs2.mkdir(outDir, { recursive: true });
    await generateSpaceRepo(sourceDir, outDir, {
      ...params.runtimeImage ? { runtimeImage: params.runtimeImage } : {}
    });
    const hub = new HubApi({ token: params.token });
    const [files, existingFiles] = await Promise.all([
      readFilesForCommit(outDir),
      hub.listSpaceFiles(params.targetRepo).catch(() => [])
    ]);
    const nextPaths = new Set(files.map((file) => file.path));
    const deletePaths = existingFiles.filter((file) => !nextPaths.has(file));
    await hub.commitSpaceFiles(params.targetRepo, {
      files,
      deletePaths,
      title: `Deploy Hugging Claw ${templateRev.slice(0, 12)}`
    });
    return { templateRev };
  } finally {
    await fs2.rm(tempRoot, { recursive: true, force: true });
  }
}
async function currentTemplateRev(sourceDir) {
  sourceDir ??= process.env.HCLAW_SOURCE_DIR ?? await findPackagedSourceRoot();
  try {
    const { stdout } = await execFileAsync2("git", ["-C", sourceDir, "rev-parse", "HEAD"]);
    const rev = stdout.trim();
    if (rev) {
      return rev;
    }
  } catch {
  }
  const pkg = JSON.parse(await fs2.readFile(path2.join(sourceDir, "package.json"), "utf8"));
  return `npm:${pkg.name ?? "huggingclaw"}@${pkg.version ?? "unknown"}`;
}
async function generateSpaceRepo(sourceDir, outDir, options = {}) {
  const copies = [
    [".gitattributes", ".gitattributes"],
    ["assets/huggingclaw.svg", "assets/huggingclaw.svg"],
    ["space/README.md", "README.md"]
  ];
  for (const [from, to] of copies) {
    await copyExisting(path2.join(sourceDir, from), path2.join(outDir, to));
  }
  await fs2.writeFile(
    path2.join(outDir, "Dockerfile"),
    `FROM ${options.runtimeImage ?? DEFAULT_RUNTIME_IMAGE}
`,
    "utf8"
  );
}
async function findPackagedSourceRoot() {
  const start = path2.dirname(fileURLToPath(import.meta.url));
  let dir = start;
  while (true) {
    if (await hasPackagedSourceFiles(dir)) {
      return dir;
    }
    const parent = path2.dirname(dir);
    if (parent === dir) {
      throw new Error("Could not find packaged Hugging Claw source files. Reinstall the huggingclaw npm package.");
    }
    dir = parent;
  }
}
async function hasPackagedSourceFiles(dir) {
  const required = [
    "package.json",
    "Dockerfile",
    "entrypoint.sh",
    "space/README.md",
    "src/hf-state-sync/cli.ts",
    "src/hf-bucket-client/client.ts"
  ];
  try {
    await Promise.all(required.map((file) => fs2.access(path2.join(dir, file))));
    return true;
  } catch {
    return false;
  }
}
async function copyExisting(from, to) {
  const stat = await fs2.stat(from);
  await fs2.mkdir(path2.dirname(to), { recursive: true });
  if (stat.isDirectory()) {
    await fs2.cp(from, to, { recursive: true });
  } else {
    await fs2.copyFile(from, to);
    await fs2.chmod(to, stat.mode);
  }
}
async function readFilesForCommit(root) {
  const files = [];
  for (const relativePath of await listFiles(root)) {
    files.push({
      path: relativePath,
      content: await fs2.readFile(path2.join(root, relativePath))
    });
  }
  return files;
}
async function listFiles(root, dir = "") {
  const absoluteDir = path2.join(root, dir);
  const entries = await fs2.readdir(absoluteDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path2.posix.join(dir.split(path2.sep).join(path2.posix.sep), entry.name);
    const absolutePath = path2.join(root, relativePath);
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      const stat = await fs2.stat(absolutePath);
      if (stat.isFile()) {
        files.push(relativePath);
      }
    }
  }
  return files.sort();
}

// src/hclaw/lease.ts
var RUNTIME_STATUS_PATH = "openclaw-state/runtime/status.json";
var DEFAULT_LEASE_TTL_MS = 3 * 60 * 1e3;
async function readRuntimeLease(hub, bucket) {
  const blob = await hub.bucket(bucket).downloadFile(RUNTIME_STATUS_PATH);
  if (!blob) {
    return null;
  }
  return JSON.parse(await blob.text());
}
function runtimeLeaseIsLive(lease, now = /* @__PURE__ */ new Date(), ttlMs = DEFAULT_LEASE_TTL_MS) {
  const last = Date.parse(lease.lastHeartbeatAt);
  return Number.isFinite(last) && now.getTime() - last < ttlMs;
}
async function assertNoLiveForeignLease(params) {
  const lease = await readRuntimeLease(params.hub, params.bucket);
  if (!lease || lease.runtimeId === params.runtimeId || !runtimeLeaseIsLive(lease) || params.takeover) {
    return;
  }
  throw new Error(
    `another gateway appears active (${lease.gatewayLocation}, ${lease.runtimeId}, heartbeat ${lease.lastHeartbeatAt}); pass --takeover to replace it`
  );
}

// src/hclaw/local-config.ts
import fs3 from "node:fs/promises";
import os3 from "node:os";
import path3 from "node:path";
function defaultConfigRoot(env = process.env) {
  const explicit = env.HUGGINGCLAW_CONFIG_HOME?.trim();
  if (explicit) {
    return explicit;
  }
  const xdg = env.XDG_CONFIG_HOME?.trim();
  if (xdg) {
    return path3.join(xdg, "huggingclaw");
  }
  return path3.join(os3.homedir(), ".config", "huggingclaw");
}
function localConfigPaths(root) {
  return {
    root,
    deploymentsDir: path3.join(root, "deployments"),
    secretsDir: path3.join(root, "secrets")
  };
}
function manifestPath(root, agent) {
  return path3.join(localConfigPaths(root).deploymentsDir, `${agent}.json`);
}
function secretEnvPath(root, agent) {
  return path3.join(localConfigPaths(root).secretsDir, `${agent}.env`);
}
async function writeManifest(root, manifest) {
  const file = manifestPath(root, manifest.agent);
  await fs3.mkdir(path3.dirname(file), { recursive: true });
  await fs3.writeFile(file, `${JSON.stringify(manifest, null, 2)}
`, "utf8");
}
async function readManifest(root, agent) {
  const file = manifestPath(root, agent);
  const parsed = JSON.parse(await fs3.readFile(file, "utf8"));
  if (parsed.version !== 1) {
    throw new Error(`unsupported deployment manifest version in ${file}`);
  }
  return parsed;
}
async function manifestExists(root, agent) {
  try {
    await fs3.access(manifestPath(root, agent));
    return true;
  } catch {
    return false;
  }
}
function renderSecretEnv(values) {
  return `${Object.entries(values).map(([key, value]) => `${key}=${quoteEnvValue(value)}`).join("\n")}
`;
}
async function writeSecretEnv(root, agent, values) {
  const file = secretEnvPath(root, agent);
  await fs3.mkdir(path3.dirname(file), { recursive: true, mode: 448 });
  await fs3.writeFile(file, renderSecretEnv(values), { encoding: "utf8", mode: 384 });
  await fs3.chmod(file, 384);
}
async function readSecretEnv(root, agent) {
  return parseSecretEnv(await fs3.readFile(secretEnvPath(root, agent), "utf8"));
}
function parseSecretEnv(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const equals = trimmed.indexOf("=");
    if (equals <= 0) {
      continue;
    }
    const key = trimmed.slice(0, equals);
    const value = trimmed.slice(equals + 1);
    out[key] = unquoteEnvValue(value);
  }
  return out;
}
function quoteEnvValue(value) {
  if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}
function unquoteEnvValue(value) {
  if (value.startsWith('"') && value.endsWith('"')) {
    return JSON.parse(value);
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

// src/hclaw/naming.ts
function slugifyAgentName(raw) {
  const cleaned = raw.trim().replace(/^@/, "").replace(/(?:[_-]?bot)$/i, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").replace(/--+/g, "-");
  if (!cleaned) {
    throw new Error(`cannot derive an agent name from ${raw}`);
  }
  return cleaned;
}
function namesFor(owner, agentName) {
  return {
    space: `${owner}/${agentName}`,
    bucket: `${owner}/${agentName}-data`
  };
}

// src/hclaw/telegram.ts
async function getTelegramBot(token, apiRoot = "https://api.telegram.org") {
  const root = apiRoot.replace(/\/+$/, "");
  const response = await fetch(`${root}/bot${token}/getMe`);
  if (!response.ok) {
    throw new Error(`Telegram getMe failed: ${response.status} ${await response.text()}`);
  }
  const body = await response.json();
  if (!body.ok || !body.result?.username) {
    throw new Error(`Telegram getMe failed: ${body.description ?? "missing bot username"}`);
  }
  return body.result;
}

// src/hclaw/cli.ts
var DEFAULT_MODEL = "huggingface/Qwen/Qwen3-8B";
var DEFAULT_HARDWARE = "cpu-basic";
var TELEGRAM_HARDWARE = "cpu-upgrade";
var TELEGRAM_SLEEP_TIME = -1;
var DEFAULT_GATEWAY_LOCATION = "local";
var DEFAULT_LOCAL_PORT = 7860;
var SPACE_HANDOFF_TIMEOUT_MS = 12e4;
var SPACE_HANDOFF_POLL_MS = 5e3;
var STALE_PATH_VARS = ["OPENCLAW_STATE_DIR", "OPENCLAW_WORKSPACE_DIR", "OPENCLAW_CONFIG_PATH"];
var PAID_HARDWARE_COST_NOTE = "Telegram requires upgraded Hugging Face Space hardware today. The cheapest option is cpu-upgrade at $0.03/hour, about $22/month if kept always on.";
var defaultPrompt = {
  isInteractive: () => Boolean(process2.stdin.isTTY && process2.stdout.isTTY),
  intro: ge,
  outro: ye,
  note: Se,
  text: Pe,
  password: Ce,
  confirm: ue,
  cancel: me
};
function createRuntime(overrides = {}) {
  return {
    env: overrides.env ?? process2.env,
    stdout: overrides.stdout ?? console,
    stderr: overrides.stderr ?? console,
    readToken: overrides.readToken ?? readToken,
    hubFactory: overrides.hubFactory ?? ((token) => new HubApi({ token })),
    pushTemplateToSpace: overrides.pushTemplateToSpace ?? pushTemplateToSpace,
    getTelegramBot: overrides.getTelegramBot ?? getTelegramBot,
    dockerRunner: overrides.dockerRunner ?? new CliDockerRunner(),
    configRoot: overrides.configRoot ?? defaultConfigRoot(overrides.env ?? process2.env),
    now: overrides.now ?? (() => /* @__PURE__ */ new Date()),
    prompt: overrides.prompt ?? defaultPrompt
  };
}
function createProgram(runtimeOverrides = {}) {
  const runtime = createRuntime(runtimeOverrides);
  const program2 = new Command();
  program2.name("hclaw").description("Deploy OpenClaw to a private Hugging Face Space and bucket").showHelpAfterError().exitOverride((err) => {
    throw err;
  });
  program2.command("bootstrap", { isDefault: true }).description("Create or update a private Hugging Face OpenClaw deployment").option("--owner <owner>", "Hugging Face user or organization").option("--name <name>", "Agent, Space, and bucket base name").option("--gateway <local|space>", "Where the live gateway runs", DEFAULT_GATEWAY_LOCATION).option("--telegram-token <token>", "Telegram bot token").option("--telegram-token-file <path>", "File containing TELEGRAM_BOT_TOKEN=... or a raw token").option("--telegram-user-id <id>", "Allowed Telegram user ID").option("--telegram-api-root <url>", "Telegram API root override").option("--telegram-proxy <url>", "Telegram proxy URL override").option("--hardware <flavor>", "Hugging Face Space hardware flavor").option("--sleep-time <seconds>", "Space sleep timeout in seconds; -1 means never sleep", parseInteger).option("--model <model>", "OpenClaw model identifier", DEFAULT_MODEL).option("--runtime-image <image>", "Hugging Claw runtime image").option("--gateway-token <token>", "OpenClaw gateway token").option("--no-pull", "Do not docker pull before starting a local gateway", false).option("--takeover", "Start even if a stale runtime lease is present", false).option("--yes", "Confirm paid hardware prompts for automation", false).action(async (opts) => {
    await bootstrap(opts, runtime);
  });
  program2.command("update").description("Regenerate and upload current HuggingClaw Space files").argument("<owner/space>", "Hugging Face Space repo ID").option("--force", "Update even if the Space does not look like HuggingClaw", false).action(async (repoId, opts) => {
    const token = await runtime.readToken(runtime.env);
    const hub = runtime.hubFactory(token);
    await update(repoId, opts, hub, token, runtime);
  });
  program2.command("doctor").description("Check a HuggingClaw Space deployment").argument("<owner/space>", "Hugging Face Space repo ID").option("--fix", "Apply safe config repairs", false).option("--bucket <owner/bucket>", "State bucket to set when missing").action(async (repoId, opts) => {
    const token = await runtime.readToken(runtime.env);
    const hub = runtime.hubFactory(token);
    await doctor(repoId, opts, hub, runtime);
  });
  program2.command("settings").description("Update Hugging Face Space hardware and sleep settings").argument("<owner/space>", "Hugging Face Space repo ID").option("--gateway <local|space>", "Record gateway location in local manifest").option("--hardware <flavor>", "Hugging Face Space hardware flavor").option("--sleep-time <seconds>", "Space sleep timeout in seconds; -1 means never sleep", parseInteger).option("--yes", "Confirm paid hardware prompts for automation", false).action(async (repoId, opts) => {
    const token = await runtime.readToken(runtime.env);
    const hub = runtime.hubFactory(token);
    await settings(repoId, opts, hub, runtime);
  });
  const gateway = program2.command("gateway").description("Operate a Hugging Claw gateway");
  gateway.command("start").argument("<agent>", "Agent name").option("--no-pull", "Do not docker pull before starting a local gateway", false).option("--takeover", "Start even if another live runtime lease is present", false).action(async (agent, opts) => {
    await gatewayStart(agent, opts, runtime);
  });
  gateway.command("stop").argument("<agent>", "Agent name").action(async (agent) => {
    await gatewayStop(agent, runtime);
  });
  gateway.command("restart").argument("<agent>", "Agent name").option("--no-pull", "Do not docker pull before starting a local gateway", false).option("--takeover", "Start even if another live runtime lease is present", false).action(async (agent, opts) => {
    await gatewayStop(agent, runtime);
    await gatewayStart(agent, opts, runtime);
  });
  gateway.command("status").argument("<agent>", "Agent name").action(async (agent) => {
    await gatewayStatus(agent, runtime);
  });
  gateway.command("logs").argument("<agent>", "Agent name").option("--tail <lines>", "Number of log lines", parseInteger, 200).action(async (agent, opts) => {
    await gatewayLogs(agent, opts, runtime);
  });
  gateway.command("migrate").argument("<agent>", "Agent name").requiredOption("--to <local|space>", "Target gateway location").option("--hardware <flavor>", "Hugging Face Space hardware flavor", TELEGRAM_HARDWARE).option("--sleep-time <seconds>", "Space sleep timeout in seconds; -1 means never sleep", parseInteger, TELEGRAM_SLEEP_TIME).option("--runtime-image <image>", "Hugging Claw runtime image").option("--no-pull", "Do not docker pull before starting a local gateway", false).option("--takeover", "Start even if another live runtime lease is present", false).option("--yes", "Confirm paid hardware prompts for automation", false).action(async (agent, opts) => {
    await gatewayMigrate(agent, opts, runtime);
  });
  return program2;
}
async function main(argv = process2.argv.slice(2), runtimeOverrides = {}) {
  const program2 = createProgram(runtimeOverrides);
  try {
    await program2.parseAsync(argv, { from: "user" });
    return typeof process2.exitCode === "number" && process2.exitCode !== 0 ? process2.exitCode : 0;
  } catch (err) {
    if (err instanceof CommanderError) {
      return err.exitCode;
    }
    const runtime = createRuntime(runtimeOverrides);
    runtime.stderr.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
}
async function bootstrap(opts, runtime) {
  runtime.prompt.intro("HuggingClaw bootstrap");
  const gatewayLocation = parseGatewayLocation(opts.gateway ?? DEFAULT_GATEWAY_LOCATION);
  const hfToken = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(hfToken);
  const me2 = await hub.whoami();
  const owner = opts.owner ?? me2.name;
  const telegramToken = await readTelegramToken(opts, runtime);
  const bot = await runtime.getTelegramBot(telegramToken, opts.telegramApiRoot);
  const agentName = slugifyAgentName(opts.name ?? bot.username);
  const telegramUserId = opts.telegramUserId ?? runtime.env.TELEGRAM_ALLOWED_USERS ?? await promptRequired("Telegram allowed user ID", runtime);
  if (!telegramUserId) {
    throw new Error("Telegram allowed user ID is required");
  }
  const names = namesFor(owner, agentName);
  const model = opts.model ?? DEFAULT_MODEL;
  const runtimeImage = resolveRuntimeImage(opts.runtimeImage, runtime.env);
  const providedGatewayToken = opts.gatewayToken;
  const gatewayToken = providedGatewayToken ?? randomBytes(32).toString("base64url");
  const now = runtime.now().toISOString();
  runtime.stdout.log(`Creating private bucket ${names.bucket}`);
  await hub.createBucket(names.bucket, true);
  const manifest = {
    version: 1,
    agent: agentName,
    owner,
    bucket: names.bucket,
    space: names.space,
    gatewayLocation,
    model,
    runtimeImage,
    createdAt: now,
    updatedAt: now
  };
  const secrets = deploymentSecrets({
    hfToken,
    telegramToken,
    telegramUserId,
    gatewayToken,
    bucket: names.bucket,
    model,
    agentName,
    runtimeImage,
    gatewayLocation,
    ...opts.telegramProxy ? { telegramProxy: opts.telegramProxy } : {},
    ...opts.telegramApiRoot ? { telegramApiRoot: opts.telegramApiRoot } : {}
  });
  await writeLocalDeployment(runtime.configRoot, manifest, secrets);
  if (gatewayLocation === "space") {
    const paidHardware = await resolveHardware({
      ...opts.hardware ? { requestedHardware: opts.hardware } : {},
      ...typeof opts.sleepTime === "number" ? { requestedSleepTime: opts.sleepTime } : {},
      yes: Boolean(opts.yes),
      runtime
    });
    await deploySpaceGateway({
      hub,
      runtime,
      hfToken,
      manifest,
      secrets,
      hardware: paidHardware.hardware,
      ...typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}
    });
  } else {
    await assertNoLiveForeignLease({
      hub,
      bucket: names.bucket,
      runtimeId: localRuntimeId(agentName),
      takeover: Boolean(opts.takeover)
    });
    await startLocalGateway({
      manifest,
      runtime,
      pull: shouldPull(opts)
    });
  }
  runtime.stdout.log("");
  runtime.stdout.log(`Bucket: https://huggingface.co/buckets/${names.bucket}`);
  if (gatewayLocation === "space") {
    runtime.stdout.log(`Space:  https://huggingface.co/spaces/${names.space}`);
  } else {
    runtime.stdout.log(`Local:  ${containerNameFor(agentName)}`);
  }
  runtime.stdout.log(`Agent:  ${agentName}${bot ? ` (@${bot.username})` : ""}`);
  runtime.stdout.log(`Gateway: ${gatewayLocation}`);
  runtime.stdout.log(`Runtime image: ${runtimeImage}`);
  if (!providedGatewayToken) {
    runtime.stdout.log("");
    runtime.stdout.log("Generated OpenClaw gateway token:");
    runtime.stdout.log(`  ${gatewayToken}`);
    runtime.stdout.log("");
    runtime.stdout.log("Save this token now. Hugging Face stores it as a write-only Space Secret.");
  }
  runtime.prompt.outro(gatewayLocation === "space" ? "Restart requested. Build logs may take a few minutes to appear." : "Local gateway start requested.");
}
function deploymentSecrets(params) {
  return {
    HF_TOKEN: params.hfToken,
    TELEGRAM_BOT_TOKEN: params.telegramToken,
    TELEGRAM_ALLOWED_USERS: params.telegramUserId,
    OPENCLAW_GATEWAY_TOKEN: params.gatewayToken,
    OPENCLAW_HF_STATE_BUCKET: params.bucket,
    OPENCLAW_MODEL: params.model,
    OPENCLAW_AGENT_NAME: params.agentName,
    HUGGINGCLAW_GATEWAY_LOCATION: params.gatewayLocation,
    HUGGINGCLAW_RUNTIME_IMAGE: params.runtimeImage,
    HUGGINGCLAW_RUNTIME_ID: params.gatewayLocation === "local" ? localRuntimeId(params.agentName) : spaceRuntimeId(params.agentName),
    OPENCLAW_GATEWAY_PORT: String(DEFAULT_LOCAL_PORT),
    ...params.telegramProxy ? { TELEGRAM_PROXY: params.telegramProxy } : {},
    ...params.telegramApiRoot ? { TELEGRAM_API_ROOT: params.telegramApiRoot } : {}
  };
}
async function writeLocalDeployment(configRoot, manifest, secrets) {
  await writeManifest(configRoot, manifest);
  await writeSecretEnv(configRoot, manifest.agent, secrets);
}
async function deploySpaceGateway(params) {
  const { hub, runtime, hfToken, manifest, secrets } = params;
  runtime.stdout.log(`Creating private Space ${manifest.space}`);
  await hub.createDockerSpace(manifest.space, {
    private: true,
    hardware: params.hardware,
    ...typeof params.sleepTime === "number" ? { sleepTimeSeconds: params.sleepTime } : {}
  });
  await hub.requestSpaceHardware(manifest.space, params.hardware, params.sleepTime);
  runtime.stdout.log("Generating Space files from huggingclaw runtime image");
  const { templateRev } = await runtime.pushTemplateToSpace({
    targetRepo: manifest.space,
    token: hfToken,
    runtimeImage: manifest.runtimeImage
  });
  await setDeploymentVariables(hub, manifest.space, {
    OPENCLAW_HF_STATE_BUCKET: manifest.bucket,
    OPENCLAW_HF_TEMPLATE_REV: templateRev,
    OPENCLAW_MODEL: manifest.model,
    OPENCLAW_AGENT_NAME: manifest.agent,
    HUGGINGCLAW_GATEWAY_LOCATION: "space",
    HUGGINGCLAW_RUNTIME_IMAGE: manifest.runtimeImage,
    HUGGINGCLAW_RUNTIME_ID: spaceRuntimeId(manifest.agent)
  });
  await hub.deleteSpaceVariable(manifest.space, "HUGGINGCLAW_GATEWAY_DISABLED").catch(() => void 0);
  await setDeploymentSecrets(hub, manifest.space, {
    OPENCLAW_GATEWAY_TOKEN: requiredSecret(secrets, "OPENCLAW_GATEWAY_TOKEN"),
    HF_TOKEN: requiredSecret(secrets, "HF_TOKEN"),
    TELEGRAM_BOT_TOKEN: requiredSecret(secrets, "TELEGRAM_BOT_TOKEN"),
    TELEGRAM_ALLOWED_USERS: requiredSecret(secrets, "TELEGRAM_ALLOWED_USERS"),
    ...secrets.TELEGRAM_PROXY ? { TELEGRAM_PROXY: secrets.TELEGRAM_PROXY } : {},
    ...secrets.TELEGRAM_API_ROOT ? { TELEGRAM_API_ROOT: secrets.TELEGRAM_API_ROOT } : {}
  });
  await hub.restartSpace(manifest.space, true);
}
async function startLocalGateway(params) {
  const { manifest, runtime } = params;
  const containerName = containerNameFor(manifest.agent);
  const existing = await runtime.dockerRunner.inspect(containerName);
  if (existing?.running) {
    runtime.stdout.log(`Local gateway already running: ${containerName}`);
    return;
  }
  if (existing) {
    await runtime.dockerRunner.start(containerName);
    runtime.stdout.log(`Local gateway started: ${containerName}`);
    return;
  }
  if (params.pull) {
    await runtime.dockerRunner.pull(manifest.runtimeImage);
  }
  await runtime.dockerRunner.run({
    containerName,
    image: manifest.runtimeImage,
    envFile: secretEnvPath(runtime.configRoot, manifest.agent),
    volumeName: volumeNameFor(manifest.agent),
    port: DEFAULT_LOCAL_PORT
  });
  runtime.stdout.log(`Local gateway created: ${containerName}`);
}
async function stopLocalGateway(manifest, runtime) {
  const containerName = containerNameFor(manifest.agent);
  const existing = await runtime.dockerRunner.inspect(containerName);
  if (!existing) {
    runtime.stdout.log(`Local gateway does not exist: ${containerName}`);
    return;
  }
  if (!existing.running) {
    runtime.stdout.log(`Local gateway already stopped: ${containerName}`);
    return;
  }
  await runtime.dockerRunner.stop(containerName);
  runtime.stdout.log(`Local gateway stopped: ${containerName}`);
}
async function gatewayStart(agent, opts, runtime) {
  const manifest = await readManifest(runtime.configRoot, agent);
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  await assertNoLiveForeignLease({
    hub,
    bucket: manifest.bucket,
    runtimeId: runtimeIdFor(manifest),
    takeover: Boolean(opts.takeover)
  });
  if (manifest.gatewayLocation === "local") {
    await startLocalGateway({ manifest, runtime, pull: shouldPull(opts) });
  } else {
    await hub.deleteSpaceVariable(manifest.space, "HUGGINGCLAW_GATEWAY_DISABLED").catch(() => void 0);
    await hub.restartSpace(manifest.space, true);
    runtime.stdout.log(`Space gateway restart requested: ${manifest.space}`);
  }
}
async function gatewayStop(agent, runtime) {
  const manifest = await readManifest(runtime.configRoot, agent);
  if (manifest.gatewayLocation === "local") {
    await stopLocalGateway(manifest, runtime);
    return;
  }
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  await disableAndPauseSpaceGateway({ manifest, hub, runtime });
}
async function gatewayStatus(agent, runtime) {
  const manifest = await readManifest(runtime.configRoot, agent);
  runtime.stdout.log(`Agent: ${manifest.agent}`);
  runtime.stdout.log(`Gateway: ${manifest.gatewayLocation}`);
  runtime.stdout.log(`Bucket: ${manifest.bucket}`);
  runtime.stdout.log(`Space: ${manifest.space}`);
  if (manifest.gatewayLocation === "local") {
    const inspect = await runtime.dockerRunner.inspect(containerNameFor(manifest.agent));
    runtime.stdout.log(`Container: ${inspect ? inspect.status ?? "exists" : "missing"}`);
    runtime.stdout.log(`Running: ${inspect?.running ? "yes" : "no"}`);
  } else {
    const token = await runtime.readToken(runtime.env);
    const hub = runtime.hubFactory(token);
    const runtimeInfo = await hub.getSpaceRuntime(manifest.space);
    runtime.stdout.log(`Stage: ${runtimeInfo.stage ?? "unknown"}`);
    runtime.stdout.log(`Hardware: ${formatRuntimeValue(runtimeInfo.requested_hardware ?? runtimeInfo.hardware)}`);
  }
  try {
    const token = await runtime.readToken(runtime.env);
    const hub = runtime.hubFactory(token);
    const lease = await readRuntimeLease(hub, manifest.bucket);
    if (lease) {
      runtime.stdout.log(`Lease: ${lease.gatewayLocation} ${lease.runtimeId} heartbeat ${lease.lastHeartbeatAt}`);
    } else {
      runtime.stdout.log("Lease: missing");
    }
  } catch (err) {
    runtime.stdout.log(`Lease: unavailable (${err instanceof Error ? err.message : String(err)})`);
  }
}
async function gatewayLogs(agent, opts, runtime) {
  const manifest = await readManifest(runtime.configRoot, agent);
  if (manifest.gatewayLocation === "local") {
    runtime.stdout.log(await runtime.dockerRunner.logs(containerNameFor(manifest.agent), opts.tail));
    return;
  }
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  runtime.stdout.log(await hub.fetchSpaceLogs(manifest.space, "run"));
}
async function gatewayMigrate(agent, opts, runtime) {
  const target = parseGatewayLocation(requiredOption(opts.to, "--to"));
  const current = await readManifest(runtime.configRoot, agent);
  if (current.gatewayLocation === target) {
    runtime.stdout.log(`Gateway already uses ${target}`);
    return;
  }
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  const secrets = await readSecretEnv(runtime.configRoot, agent);
  const updated = {
    ...current,
    gatewayLocation: target,
    runtimeImage: resolveRuntimeImage(opts.runtimeImage ?? current.runtimeImage, runtime.env),
    updatedAt: runtime.now().toISOString()
  };
  if (target === "space") {
    const paidHardware = await resolveHardware({
      requestedHardware: opts.hardware ?? TELEGRAM_HARDWARE,
      requestedSleepTime: typeof opts.sleepTime === "number" ? opts.sleepTime : TELEGRAM_SLEEP_TIME,
      yes: Boolean(opts.yes),
      runtime
    });
    await stopLocalGateway(current, runtime);
    await deploySpaceGateway({
      hub,
      runtime,
      hfToken: token,
      manifest: updated,
      secrets: {
        ...secrets,
        HUGGINGCLAW_GATEWAY_LOCATION: "space",
        HUGGINGCLAW_RUNTIME_IMAGE: updated.runtimeImage
      },
      hardware: paidHardware.hardware,
      ...typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}
    });
    await writeSecretEnv(runtime.configRoot, agent, {
      ...secrets,
      HUGGINGCLAW_GATEWAY_LOCATION: "space",
      HUGGINGCLAW_RUNTIME_IMAGE: updated.runtimeImage,
      HUGGINGCLAW_RUNTIME_ID: spaceRuntimeId(agent)
    });
  } else {
    await disableAndPauseSpaceGateway({ manifest: current, hub, runtime });
    await assertNoLiveForeignLease({
      hub,
      bucket: current.bucket,
      runtimeId: localRuntimeId(current.agent),
      takeover: true
    });
    await writeSecretEnv(runtime.configRoot, agent, {
      ...secrets,
      HUGGINGCLAW_GATEWAY_LOCATION: "local",
      HUGGINGCLAW_RUNTIME_IMAGE: updated.runtimeImage,
      HUGGINGCLAW_RUNTIME_ID: localRuntimeId(agent)
    });
    await startLocalGateway({ manifest: updated, runtime, pull: shouldPull(opts) });
  }
  await writeManifest(runtime.configRoot, updated);
  runtime.stdout.log(`Gateway migrated to ${target}`);
}
function localRuntimeId(agent) {
  return `local-${agent}`;
}
function runtimeIdFor(manifest) {
  return manifest.gatewayLocation === "local" ? localRuntimeId(manifest.agent) : spaceRuntimeId(manifest.agent);
}
function spaceRuntimeId(agent) {
  return `space-${agent}`;
}
async function disableAndPauseSpaceGateway(params) {
  const handoffStartedAt = params.runtime.now();
  await params.hub.addSpaceVariable(params.manifest.space, "HUGGINGCLAW_GATEWAY_DISABLED", "1");
  await params.hub.restartSpace(params.manifest.space, true);
  params.runtime.stdout.log("Waiting for Space gateway to upload a final snapshot");
  try {
    await waitForRuntimeLease({
      hub: params.hub,
      bucket: params.manifest.bucket,
      runtimeId: spaceRuntimeId(params.manifest.agent),
      since: handoffStartedAt,
      timeoutMs: SPACE_HANDOFF_TIMEOUT_MS,
      pollMs: SPACE_HANDOFF_POLL_MS
    });
    params.runtime.stdout.log("Space final snapshot observed");
  } finally {
    await params.hub.pauseSpace(params.manifest.space);
    params.runtime.stdout.log(`Space pause requested: ${params.manifest.space}`);
  }
}
async function waitForRuntimeLease(params) {
  const started = Date.now();
  let lastError;
  while (true) {
    try {
      const lease = await readRuntimeLease(params.hub, params.bucket);
      const heartbeatAt = lease ? Date.parse(lease.lastHeartbeatAt) : Number.NaN;
      if (lease?.runtimeId === params.runtimeId && Number.isFinite(heartbeatAt) && heartbeatAt >= params.since.getTime()) {
        return lease;
      }
      lastError = void 0;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    if (Date.now() - started >= params.timeoutMs) {
      const detail = lastError ? `; last lease read failed: ${lastError}` : "";
      throw new Error(`timed out waiting for ${params.runtimeId} to upload a final snapshot${detail}`);
    }
    await delay(params.pollMs);
  }
}
function requiredSecret(secrets, key) {
  const value = secrets[key];
  if (!value) {
    throw new Error(`missing local secret ${key}; cannot configure gateway`);
  }
  return value;
}
function requiredOption(value, label) {
  if (!value) {
    throw new Error(`${label} is required`);
  }
  return value;
}
function shouldPull(opts) {
  return opts.pull !== false;
}
async function update(repoId, opts, hub, hfToken, runtime) {
  const variables = await hub.getSpaceVariables(repoId);
  if (!variables.has("OPENCLAW_HF_TEMPLATE_REV") && !opts.force) {
    throw new Error(`${repoId} does not look like a HuggingClaw deployment; pass --force to update anyway`);
  }
  runtime.stdout.log(`Generating current Space files into ${repoId}`);
  const { templateRev } = await runtime.pushTemplateToSpace({
    targetRepo: repoId,
    token: hfToken,
    runtimeImage: resolveRuntimeImage(void 0, runtime.env)
  });
  await hub.addSpaceVariable(repoId, "OPENCLAW_HF_TEMPLATE_REV", templateRev);
  await hub.restartSpace(repoId, true);
  await doctor(repoId, { fix: true }, hub, runtime);
}
async function doctor(repoId, opts, hub, runtime) {
  if (!repoId.includes("/") && await manifestExists(runtime.configRoot, repoId)) {
    await gatewayStatus(repoId, runtime);
    return;
  }
  const fix = Boolean(opts.fix);
  const variables = await hub.getSpaceVariables(repoId);
  const secrets = await hub.getSpaceSecrets(repoId);
  const issues = [];
  const fixed = [];
  const bucket = variables.get("OPENCLAW_HF_STATE_BUCKET")?.value ?? opts.bucket;
  if (!bucket) {
    issues.push("OPENCLAW_HF_STATE_BUCKET is missing");
  } else if (!variables.has("OPENCLAW_HF_STATE_BUCKET") && fix) {
    await hub.addSpaceVariable(repoId, "OPENCLAW_HF_STATE_BUCKET", bucket);
    fixed.push("set OPENCLAW_HF_STATE_BUCKET");
  }
  for (const key of STALE_PATH_VARS) {
    if (variables.has(key)) {
      if (fix) {
        await hub.deleteSpaceVariable(repoId, key);
        fixed.push(`deleted ${key}`);
      } else {
        issues.push(`${key} is set; runtime now derives it from OPENCLAW_LIVE_DIR`);
      }
    }
  }
  for (const key of ["OPENCLAW_GATEWAY_TOKEN", "HF_TOKEN"]) {
    if (!secrets.has(key)) {
      issues.push(`secret ${key} is missing`);
    }
  }
  if (!variables.has("OPENCLAW_HF_TEMPLATE_REV")) {
    issues.push("OPENCLAW_HF_TEMPLATE_REV is missing; updates cannot verify template lineage");
  }
  if ((variables.get("HUGGINGCLAW_GATEWAY_LOCATION")?.value ?? "") !== "space") {
    issues.push("HUGGINGCLAW_GATEWAY_LOCATION is not set to space");
  }
  if (!variables.has("HUGGINGCLAW_RUNTIME_IMAGE")) {
    issues.push("HUGGINGCLAW_RUNTIME_IMAGE is missing");
  }
  if (bucket) {
    await hub.assertBucketAccessible(bucket);
  }
  const runtimeInfo = await hub.getSpaceRuntime(repoId);
  let logs = "";
  try {
    logs = await hub.fetchSpaceLogs(repoId, "run");
  } catch {
    issues.push("run logs are not available yet");
  }
  const hasRestoreOutcome = /restored snapshot|fresh start/i.test(logs);
  const hasSnapshotOutcome = /snapshot .* uploaded/i.test(logs);
  if (logs && !hasRestoreOutcome) {
    issues.push("run logs do not show a restore or fresh-start outcome yet");
  }
  if (logs && !hasSnapshotOutcome) {
    issues.push("run logs do not show a recent uploaded snapshot yet");
  }
  runtime.stdout.log(`Space: ${repoId}`);
  runtime.stdout.log(`Stage: ${runtimeInfo.stage ?? "unknown"}`);
  runtime.stdout.log(`Hardware: ${formatRuntimeValue(runtimeInfo.requested_hardware ?? runtimeInfo.hardware)}`);
  if (typeof runtimeInfo.sleep_time === "number") {
    runtime.stdout.log(`Sleep time: ${runtimeInfo.sleep_time}`);
  }
  if (fixed.length > 0) {
    runtime.stdout.log(`Fixed: ${fixed.join(", ")}`);
  }
  if (issues.length === 0) {
    runtime.stdout.log("Doctor: clean");
  } else {
    runtime.stdout.log("Doctor findings:");
    for (const issue of issues) {
      runtime.stdout.log(`- ${issue}`);
    }
  }
}
async function settings(repoId, opts, hub, runtime) {
  if (!opts.hardware && typeof opts.sleepTime !== "number" && !opts.gateway) {
    throw new Error("usage: hclaw settings <owner/space> [--gateway local|space] [--hardware flavor] [--sleep-time seconds]");
  }
  if (opts.gateway && !repoId.includes("/") && await manifestExists(runtime.configRoot, repoId)) {
    const gatewayLocation = parseGatewayLocation(opts.gateway);
    const manifest = await readManifest(runtime.configRoot, repoId);
    await writeManifest(runtime.configRoot, {
      ...manifest,
      gatewayLocation,
      updatedAt: runtime.now().toISOString()
    });
    runtime.stdout.log(`Gateway setting recorded: ${gatewayLocation}`);
    return;
  }
  if (!opts.hardware && typeof opts.sleepTime !== "number") {
    throw new Error("Space hardware or sleep time is required when settings targets a Space repo");
  }
  if (opts.hardware && isPaidHardware(opts.hardware)) {
    await confirmPaidHardware({
      hardware: opts.hardware,
      ...typeof opts.sleepTime === "number" ? { sleepTime: opts.sleepTime } : {},
      yes: Boolean(opts.yes),
      runtime
    });
  }
  const result = opts.hardware ? await hub.requestSpaceHardware(repoId, opts.hardware, opts.sleepTime) : await hub.setSpaceSleepTime(repoId, opts.sleepTime);
  runtime.stdout.log("Space settings updated");
  runtime.stdout.log(`Space: ${repoId}`);
  runtime.stdout.log(`Hardware: ${formatRuntimeValue(result.requested_hardware ?? result.hardware)}`);
  if (typeof opts.sleepTime === "number") {
    runtime.stdout.log(`Sleep time: ${opts.sleepTime}`);
  }
}
function formatRuntimeValue(value) {
  if (!value) {
    return "unknown";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && "current" in value && typeof value.current === "string") {
    return value.current;
  }
  if (typeof value === "object" && "requested" in value && typeof value.requested === "string") {
    return value.requested;
  }
  return JSON.stringify(value);
}
async function setDeploymentVariables(hub, repoId, variables) {
  for (const [key, value] of Object.entries(variables)) {
    await hub.addSpaceVariable(repoId, key, value);
  }
}
async function setDeploymentSecrets(hub, repoId, secrets) {
  for (const [key, value] of Object.entries(secrets)) {
    await hub.addSpaceSecret(repoId, key, value);
  }
}
async function readTelegramToken(opts, runtime) {
  const direct = opts.telegramToken ?? runtime.env.TELEGRAM_BOT_TOKEN;
  if (direct) {
    return direct;
  }
  if (opts.telegramTokenFile) {
    const raw = await fs4.readFile(opts.telegramTokenFile, "utf8");
    const match = raw.match(/(?:^|\n)\s*TELEGRAM_BOT_TOKEN\s*=\s*['"]?([^'"\n]+)['"]?/);
    return (match?.[1] ?? raw.trim()).trim();
  }
  if (!runtime.prompt.isInteractive()) {
    throw new Error("Telegram bot token is required; pass --telegram-token or --telegram-token-file");
  }
  const value = await runtime.prompt.password({
    message: "Telegram bot token",
    placeholder: "123456:ABC..."
  });
  return readPromptValue(value, "Telegram bot token");
}
async function resolveHardware(params) {
  const hardware = params.requestedHardware ?? TELEGRAM_HARDWARE;
  if (!isPaidHardware(hardware)) {
    throw new Error(`Telegram requires upgraded paid Space hardware today; use --hardware ${TELEGRAM_HARDWARE}`);
  }
  const sleepTime = params.requestedSleepTime ?? TELEGRAM_SLEEP_TIME;
  await confirmPaidHardware({
    hardware,
    sleepTime,
    yes: params.yes,
    runtime: params.runtime
  });
  return { hardware, sleepTime };
}
async function confirmPaidHardware(params) {
  if (params.yes) {
    return;
  }
  if (!params.runtime.prompt.isInteractive()) {
    throw new Error("paid Hugging Face Space hardware requires explicit consent; pass --yes to confirm");
  }
  params.runtime.prompt.note(
    `${PAID_HARDWARE_COST_NOTE}

Requested hardware: ${params.hardware}${typeof params.sleepTime === "number" ? `
Requested sleep-time: ${params.sleepTime}` : ""}`,
    "Cost warning"
  );
  const ok = await promptConfirm("Request paid Hugging Face Space hardware?", false, params.runtime);
  if (!ok) {
    throw new Error("paid hardware was not confirmed");
  }
}
async function promptRequired(label, runtime) {
  if (!runtime.prompt.isInteractive()) {
    throw new Error(`${label} is required`);
  }
  const value = await runtime.prompt.text({ message: label });
  return readPromptValue(value, label);
}
async function promptConfirm(label, initialValue, runtime) {
  const value = await runtime.prompt.confirm({ message: label, initialValue });
  if (q(value)) {
    runtime.prompt.cancel("Cancelled");
    throw new Error("cancelled");
  }
  return Boolean(value);
}
function readPromptValue(value, label) {
  if (q(value)) {
    me("Cancelled");
    throw new Error("cancelled");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
}
function parseInteger(value) {
  if (!/^-?\d+$/.test(value)) {
    throw new InvalidArgumentError("expected an integer");
  }
  return Number.parseInt(value, 10);
}
function isPaidHardware(hardware) {
  return hardware !== DEFAULT_HARDWARE;
}
var invokedPath = "";
try {
  invokedPath = process2.argv[1] ? pathToFileURL(realpathSync(process2.argv[1])).href : "";
} catch {
  invokedPath = "";
}
if (import.meta.url === invokedPath) {
  main().then((code) => process2.exit(code));
}
export {
  DEFAULT_GATEWAY_LOCATION,
  DEFAULT_HARDWARE,
  DEFAULT_LOCAL_PORT,
  DEFAULT_MODEL,
  SPACE_HANDOFF_POLL_MS,
  SPACE_HANDOFF_TIMEOUT_MS,
  TELEGRAM_HARDWARE,
  TELEGRAM_SLEEP_TIME,
  createProgram,
  main
};
