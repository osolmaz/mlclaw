#!/usr/bin/env node
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x3) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x3, {
  get: (a, b2) => (typeof require !== "undefined" ? require : a)[b2]
}) : x3)(function(x3) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x3 + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
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
          visibleCommands.sort((a, b2) => {
            return a.name().localeCompare(b2.name());
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
      compareOptions(a, b2) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b2));
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
    function editDistance(a, b2) {
      if (Math.abs(a.length - b2.length) > maxDistance)
        return Math.max(a.length, b2.length);
      const d = [];
      for (let i = 0; i <= a.length; i++) {
        d[i] = [i];
      }
      for (let j2 = 0; j2 <= b2.length; j2++) {
        d[0][j2] = j2;
      }
      for (let j2 = 1; j2 <= b2.length; j2++) {
        for (let i = 1; i <= a.length; i++) {
          let cost = 1;
          if (a[i - 1] === b2[j2 - 1]) {
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
          if (i > 1 && j2 > 1 && a[i - 1] === b2[j2 - 2] && a[i - 2] === b2[j2 - 1]) {
            d[i][j2] = Math.min(d[i][j2], d[i - 2][j2 - 2] + 1);
          }
        }
      }
      return d[a.length][b2.length];
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
      similar.sort((a, b2) => a.localeCompare(b2));
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
    var path17 = __require("node:path");
    var fs17 = __require("node:fs");
    var process5 = __require("node:process");
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
          writeOut: (str) => process5.stdout.write(str),
          writeErr: (str) => process5.stderr.write(str),
          outputError: (str, write) => write(str),
          getOutHelpWidth: () => process5.stdout.isTTY ? process5.stdout.columns : void 0,
          getErrHelpWidth: () => process5.stderr.isTTY ? process5.stderr.columns : void 0,
          getOutHasColors: () => useColor() ?? (process5.stdout.isTTY && process5.stdout.hasColors?.()),
          getErrHasColors: () => useColor() ?? (process5.stderr.isTTY && process5.stderr.hasColors?.()),
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
        process5.exit(exitCode);
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
          if (process5.versions?.electron) {
            parseOptions.from = "electron";
          }
          const execArgv = process5.execArgv ?? [];
          if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
            parseOptions.from = "eval";
          }
        }
        if (argv === void 0) {
          argv = process5.argv;
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
            if (process5.defaultApp) {
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
        if (fs17.existsSync(executableFile)) return;
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
          const localBin = path17.resolve(baseDir, baseName);
          if (fs17.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path17.extname(baseName))) return void 0;
          const foundExt = sourceExt.find(
            (ext) => fs17.existsSync(`${localBin}${ext}`)
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
            resolvedScriptPath = fs17.realpathSync(this._scriptPath);
          } catch {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path17.resolve(
            path17.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path17.basename(
              this._scriptPath,
              path17.extname(this._scriptPath)
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
        launchWithNode = sourceExt.includes(path17.extname(executableFile));
        let proc;
        if (process5.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process5.execArgv).concat(args);
            proc = childProcess.spawn(process5.argv[0], args, { stdio: "inherit" });
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
          args = incrementNodeInspectorPort(process5.execArgv).concat(args);
          proc = childProcess.spawn(process5.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process5.on(signal, () => {
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
            process5.exit(code);
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
            process5.exit(1);
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
          if (option.envVar && option.envVar in process5.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
              this.getOptionValueSource(optionKey)
            )) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process5.env[option.envVar]);
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
        this._name = path17.basename(filename, path17.extname(filename));
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
      executableDir(path18) {
        if (path18 === void 0) return this._executableDir;
        this._executableDir = path18;
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
        let exitCode = Number(process5.exitCode ?? 0);
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
      if (process5.env.NO_COLOR || process5.env.FORCE_COLOR === "0" || process5.env.FORCE_COLOR === "false")
        return false;
      if (process5.env.FORCE_COLOR || process5.env.CLICOLOR_FORCE !== void 0)
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

// node_modules/fast-string-truncated-width/dist/utils.js
var getCodePointsLength, isFullWidth, isWideNotCJKTNotEmoji;
var init_utils = __esm({
  "node_modules/fast-string-truncated-width/dist/utils.js"() {
    getCodePointsLength = /* @__PURE__ */ (() => {
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
    isFullWidth = (x3) => {
      return x3 === 12288 || x3 >= 65281 && x3 <= 65376 || x3 >= 65504 && x3 <= 65510;
    };
    isWideNotCJKTNotEmoji = (x3) => {
      return x3 === 8987 || x3 === 9001 || x3 >= 12272 && x3 <= 12287 || x3 >= 12289 && x3 <= 12350 || x3 >= 12441 && x3 <= 12543 || x3 >= 12549 && x3 <= 12591 || x3 >= 12593 && x3 <= 12686 || x3 >= 12688 && x3 <= 12771 || x3 >= 12783 && x3 <= 12830 || x3 >= 12832 && x3 <= 12871 || x3 >= 12880 && x3 <= 19903 || x3 >= 65040 && x3 <= 65049 || x3 >= 65072 && x3 <= 65106 || x3 >= 65108 && x3 <= 65126 || x3 >= 65128 && x3 <= 65131 || x3 >= 127488 && x3 <= 127490 || x3 >= 127504 && x3 <= 127547 || x3 >= 127552 && x3 <= 127560 || x3 >= 131072 && x3 <= 196605 || x3 >= 196608 && x3 <= 262141;
    };
  }
});

// node_modules/fast-string-truncated-width/dist/index.js
var ANSI_RE, CONTROL_RE, CJKT_WIDE_RE, TAB_RE, EMOJI_RE, LATIN_RE, MODIFIER_RE, NO_TRUNCATION, getStringTruncatedWidth, dist_default;
var init_dist = __esm({
  "node_modules/fast-string-truncated-width/dist/index.js"() {
    init_utils();
    ANSI_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|\u001b\]8;[^;]*;.*?(?:\u0007|\u001b\u005c)/y;
    CONTROL_RE = /[\x00-\x08\x0A-\x1F\x7F-\x9F]{1,1000}/y;
    CJKT_WIDE_RE = /(?:(?![\uFF61-\uFF9F\uFF00-\uFFEF])[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Tangut}]){1,1000}/yu;
    TAB_RE = /\t{1,1000}/y;
    EMOJI_RE = new RegExp("[\\u{1F1E6}-\\u{1F1FF}]{2}|\\u{1F3F4}[\\u{E0061}-\\u{E007A}]{2}[\\u{E0030}-\\u{E0039}\\u{E0061}-\\u{E007A}]{1,3}\\u{E007F}|(?:\\p{Emoji}\\uFE0F\\u20E3?|\\p{Emoji_Modifier_Base}\\p{Emoji_Modifier}?|\\p{Emoji_Presentation})(?:\\u200D(?:\\p{Emoji_Modifier_Base}\\p{Emoji_Modifier}?|\\p{Emoji_Presentation}|\\p{Emoji}\\uFE0F\\u20E3?))*", "yu");
    LATIN_RE = /(?:[\x20-\x7E\xA0-\xFF](?!\uFE0F)){1,1000}/y;
    MODIFIER_RE = new RegExp("\\p{M}+", "gu");
    NO_TRUNCATION = { limit: Infinity, ellipsis: "" };
    getStringTruncatedWidth = (input, truncationOptions = {}, widthOptions = {}) => {
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
    dist_default = getStringTruncatedWidth;
  }
});

// node_modules/fast-string-width/dist/index.js
var NO_TRUNCATION2, fastStringWidth, dist_default2;
var init_dist2 = __esm({
  "node_modules/fast-string-width/dist/index.js"() {
    init_dist();
    NO_TRUNCATION2 = {
      limit: Infinity,
      ellipsis: "",
      ellipsisWidth: 0
    };
    fastStringWidth = (input, options = {}) => {
      return dist_default(input, NO_TRUNCATION2, options).width;
    };
    dist_default2 = fastStringWidth;
  }
});

// node_modules/fast-wrap-ansi/lib/main.js
function wrapAnsi(string, columns, options) {
  return String(string).normalize().split(CRLF_OR_LF).map((line) => exec(line, columns, options)).join("\n");
}
var ESC, CSI, END_CODE, ANSI_ESCAPE_BELL, ANSI_CSI, ANSI_OSC, ANSI_SGR_TERMINATOR, ANSI_ESCAPE_LINK, GROUP_REGEX, getClosingCode, wrapAnsiCode, wrapAnsiHyperlink, wrapWord, stringVisibleTrimSpacesRight, exec, CRLF_OR_LF;
var init_main = __esm({
  "node_modules/fast-wrap-ansi/lib/main.js"() {
    init_dist2();
    ESC = "\x1B";
    CSI = "\x9B";
    END_CODE = 39;
    ANSI_ESCAPE_BELL = "\x07";
    ANSI_CSI = "[";
    ANSI_OSC = "]";
    ANSI_SGR_TERMINATOR = "m";
    ANSI_ESCAPE_LINK = `${ANSI_OSC}8;;`;
    GROUP_REGEX = new RegExp(`(?:\\${ANSI_CSI}(?<code>\\d+)m|\\${ANSI_ESCAPE_LINK}(?<uri>.*)${ANSI_ESCAPE_BELL})`, "y");
    getClosingCode = (openingCode) => {
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
    wrapAnsiCode = (code) => `${ESC}${ANSI_CSI}${code}${ANSI_SGR_TERMINATOR}`;
    wrapAnsiHyperlink = (url) => `${ESC}${ANSI_ESCAPE_LINK}${url}${ANSI_ESCAPE_BELL}`;
    wrapWord = (rows, word, columns) => {
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
    stringVisibleTrimSpacesRight = (string) => {
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
    exec = (string, columns, options = {}) => {
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
    CRLF_OR_LF = /\r?\n/;
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

// node_modules/@clack/core/dist/index.mjs
import { styleText as v } from "node:util";
import { stdout as x, stdin as D } from "node:process";
import * as b from "node:readline";
import E from "node:readline";
import { ReadStream as O } from "node:tty";
function f(r, t, s) {
  if (!s.some((o) => !o.disabled)) return r;
  const e2 = r + t, i = Math.max(s.length - 1, 0), n = e2 < 0 ? i : e2 > i ? 0 : e2;
  return s[n].disabled ? f(n, t < 0 ? -1 : 1, s) : n;
}
function I(r, t, s, e2) {
  const i = e2.split(`
`);
  let n = 0, o = r;
  for (const a of i) {
    if (o <= a.length) break;
    o -= a.length + 1, n++;
  }
  for (n = Math.max(0, Math.min(i.length - 1, n + s)), o = Math.min(o, i[n].length) + t; o < 0 && n > 0; ) n--, o += i[n].length + 1;
  for (; o > i[n].length && n < i.length - 1; ) o -= i[n].length + 1, n++;
  o = Math.max(0, Math.min(i[n].length, o));
  let u = 0;
  for (let a = 0; a < n; a++) u += i[a].length + 1;
  return u + o;
}
function j(r) {
  if (r.aliases !== void 0) {
    const t = r.aliases;
    for (const s in t) {
      if (!Object.hasOwn(t, s)) continue;
      const e2 = t[s];
      h.actions.has(e2) && (h.aliases.has(s) || h.aliases.set(s, e2));
    }
  }
  if (r.messages !== void 0) {
    const t = r.messages;
    t.cancel !== void 0 && (h.messages.cancel = t.cancel), t.error !== void 0 && (h.messages.error = t.error);
  }
  if (r.withGuide !== void 0 && (h.withGuide = r.withGuide !== false), r.date !== void 0) {
    const t = r.date;
    t.monthNames !== void 0 && (h.date.monthNames = [...t.monthNames]), t.messages !== void 0 && (t.messages.required !== void 0 && (h.date.messages.required = t.messages.required), t.messages.invalidMonth !== void 0 && (h.date.messages.invalidMonth = t.messages.invalidMonth), t.messages.invalidDay !== void 0 && (h.date.messages.invalidDay = t.messages.invalidDay), t.messages.afterMin !== void 0 && (h.date.messages.afterMin = t.messages.afterMin), t.messages.beforeMax !== void 0 && (h.date.messages.beforeMax = t.messages.beforeMax));
  }
}
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
function q(r) {
  return r === k;
}
function w(r, t) {
  const s = r;
  s.isTTY && s.setRawMode(t);
}
function R({ input: r = D, output: t = x, overwrite: s = true, hideCursor: e2 = true } = {}) {
  const i = b.createInterface({ input: r, output: t, prompt: "", tabSize: 1 });
  b.emitKeypressEvents(r, i), r instanceof O && r.isTTY && r.setRawMode(true);
  const n = (o, { name: u, sequence: a }) => {
    const l = String(o);
    if (C([l, u, a], "cancel")) {
      e2 && t.write(import_sisteransi.cursor.show), process.exit(0);
      return;
    }
    if (!s) return;
    const c = u === "return" ? 0 : -1, y = u === "return" ? -1 : 0;
    b.moveCursor(t, c, y, () => {
      b.clearLine(t, 1, () => {
        r.once("keypress", n);
      });
    });
  };
  return e2 && t.write(import_sisteransi.cursor.hide), r.once("keypress", n), () => {
    r.off("keypress", n), e2 && t.write(import_sisteransi.cursor.show), r instanceof O && r.isTTY && !Y && r.setRawMode(false), i.terminal = false, i.close();
  };
}
function W(r, t, s, e2 = s, i = s, n) {
  const o = A(r ?? x);
  return wrapAnsi(t, o - s.length, { hard: true, trim: false }).split(`
`).map((u, a, l) => {
    const c = n ? n(u, a) : u;
    return a === 0 ? `${e2}${c}` : a === l.length - 1 ? `${i}${c}` : `${s}${c}`;
  }).join(`
`);
}
function B(r, t) {
  if (r === void 0 || t.length === 0) return 0;
  const s = t.findIndex((e2) => e2.value === r);
  return s !== -1 ? s : 0;
}
function J(r, t) {
  return (t.label ?? String(t.value)).toLowerCase().includes(r.toLowerCase());
}
function H(r, t) {
  if (t) return r ? t : t[0];
}
function P(r) {
  return [...r].map((t) => Z[t]);
}
function tt(r) {
  const t = new Intl.DateTimeFormat(r, { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(2e3, 0, 15)), s = [];
  let e2 = "/";
  for (const i of t) i.type === "literal" ? e2 = i.value.trim() || i.value : (i.type === "year" || i.type === "month" || i.type === "day") && s.push({ type: i.type, len: i.type === "year" ? 4 : 2 });
  return { segments: s, separator: e2 };
}
function $(r) {
  return Number.parseInt((r || "0").replace(/_/g, "0"), 10) || 0;
}
function S(r) {
  return { year: $(r.year), month: $(r.month), day: $(r.day) };
}
function U(r, t) {
  return new Date(r || 2001, t || 1, 0).getDate();
}
function F(r) {
  const { year: t, month: s, day: e2 } = S(r);
  if (!t || t < 0 || t > 9999 || !s || s < 1 || s > 12 || !e2 || e2 < 1) return;
  const i = new Date(Date.UTC(t, s - 1, e2));
  if (!(i.getUTCFullYear() !== t || i.getUTCMonth() !== s - 1 || i.getUTCDate() !== e2)) return { year: t, month: s, day: e2 };
}
function N(r) {
  const t = F(r);
  return t ? new Date(Date.UTC(t.year, t.month - 1, t.day)) : void 0;
}
function st(r, t, s, e2) {
  const i = s ? { year: s.getUTCFullYear(), month: s.getUTCMonth() + 1, day: s.getUTCDate() } : null, n = e2 ? { year: e2.getUTCFullYear(), month: e2.getUTCMonth() + 1, day: e2.getUTCDate() } : null;
  return r === "year" ? { min: i?.year ?? 1, max: n?.year ?? 9999 } : r === "month" ? { min: i && t.year === i.year ? i.month : 1, max: n && t.year === n.year ? n.month : 12 } : { min: i && t.year === i.year && t.month === i.month ? i.day : 1, max: n && t.year === n.year && t.month === n.month ? n.day : U(t.year, t.month) };
}
var import_sisteransi, G, K, h, Y, k, A, L, m, Q, X, Z, et, it, rt, nt, ot, ut, at, ht;
var init_dist3 = __esm({
  "node_modules/@clack/core/dist/index.mjs"() {
    init_main();
    import_sisteransi = __toESM(require_src(), 1);
    G = ["up", "down", "left", "right", "space", "enter", "cancel"];
    K = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    h = { actions: new Set(G), aliases: /* @__PURE__ */ new Map([["k", "up"], ["j", "down"], ["h", "left"], ["l", "right"], ["", "cancel"], ["escape", "cancel"]]), messages: { cancel: "Canceled", error: "Something went wrong" }, withGuide: true, date: { monthNames: [...K], messages: { required: "Please enter a valid date", invalidMonth: "There are only 12 months in a year", invalidDay: (r, t) => `There are only ${r} days in ${t}`, afterMin: (r) => `Date must be on or after ${r.toISOString().slice(0, 10)}`, beforeMax: (r) => `Date must be on or before ${r.toISOString().slice(0, 10)}` } } };
    Y = globalThis.process.platform.startsWith("win");
    k = Symbol("clack:cancel");
    A = (r) => "columns" in r && typeof r.columns == "number" ? r.columns : 80;
    L = (r) => "rows" in r && typeof r.rows == "number" ? r.rows : 20;
    m = class {
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
    Q = class extends m {
      filteredOptions;
      multiple;
      isNavigating = false;
      selectedValues = [];
      focusedValue;
      #s = 0;
      #r = "";
      #t;
      #n;
      #u;
      get cursor() {
        return this.#s;
      }
      get userInputWithCursor() {
        if (!this.userInput) return v(["inverse", "hidden"], "_");
        if (this._cursor >= this.userInput.length) return `${this.userInput}\u2588`;
        const t = this.userInput.slice(0, this._cursor), [s, ...e2] = this.userInput.slice(this._cursor);
        return `${t}${v("inverse", s)}${e2.join("")}`;
      }
      get options() {
        return typeof this.#n == "function" ? this.#n() : this.#n;
      }
      constructor(t) {
        super(t), this.#n = t.options, this.#u = t.placeholder;
        const s = this.options;
        this.filteredOptions = [...s], this.multiple = t.multiple === true, this.#t = typeof t.options == "function" ? t.filter : t.filter ?? J;
        let e2;
        if (t.initialValue && Array.isArray(t.initialValue) ? this.multiple ? e2 = t.initialValue : e2 = t.initialValue.slice(0, 1) : !this.multiple && this.options.length > 0 && (e2 = [this.options[0].value]), e2) for (const i of e2) {
          const n = s.findIndex((o) => o.value === i);
          n !== -1 && (this.toggleSelected(i), this.#s = n);
        }
        this.focusedValue = this.options[this.#s]?.value, this.on("key", (i, n) => this.#e(i, n)), this.on("userInput", (i) => this.#i(i));
      }
      _isActionKey(t, s) {
        return t === "	" || this.multiple && this.isNavigating && s.name === "space" && t !== void 0 && t !== "";
      }
      #e(t, s) {
        const e2 = s.name === "up", i = s.name === "down", n = s.name === "return", o = this.userInput === "" || this.userInput === "	", u = this.#u, a = this.options, l = u !== void 0 && u !== "" && a.some((c) => !c.disabled && (this.#t ? this.#t(u, c) : true));
        if (s.name === "tab" && o && l) {
          this.userInput === "	" && this._clearUserInput(), this._setUserInput(u, true), this.isNavigating = false;
          return;
        }
        e2 || i ? (this.#s = f(this.#s, e2 ? -1 : 1, this.filteredOptions), this.focusedValue = this.filteredOptions[this.#s]?.value, this.multiple || (this.selectedValues = [this.focusedValue]), this.isNavigating = true) : n ? this.value = H(this.multiple, this.selectedValues) : this.multiple ? this.focusedValue !== void 0 && (s.name === "tab" || this.isNavigating && s.name === "space") ? this.toggleSelected(this.focusedValue) : this.isNavigating = false : (this.focusedValue && (this.selectedValues = [this.focusedValue]), this.isNavigating = false);
      }
      deselectAll() {
        this.selectedValues = [];
      }
      toggleSelected(t) {
        this.filteredOptions.length !== 0 && (this.multiple ? this.selectedValues.includes(t) ? this.selectedValues = this.selectedValues.filter((s) => s !== t) : this.selectedValues = [...this.selectedValues, t] : this.selectedValues = [t]);
      }
      #i(t) {
        if (t !== this.#r) {
          this.#r = t;
          const s = this.options;
          t && this.#t ? this.filteredOptions = s.filter((n) => this.#t?.(t, n)) : this.filteredOptions = [...s];
          const e2 = B(this.focusedValue, this.filteredOptions);
          this.#s = f(e2, 0, this.filteredOptions);
          const i = this.filteredOptions[this.#s];
          i && !i.disabled ? this.focusedValue = i.value : this.focusedValue = void 0, this.multiple || (this.focusedValue !== void 0 ? this.toggleSelected(this.focusedValue) : this.deselectAll());
        }
      }
    };
    X = class extends m {
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
    Z = { Y: { type: "year", len: 4 }, M: { type: "month", len: 2 }, D: { type: "day", len: 2 } };
    et = class extends m {
      #s;
      #r;
      #t;
      #n;
      #u;
      #e = { segmentIndex: 0, positionInSegment: 0 };
      #i = true;
      #o = null;
      inlineError = "";
      get segmentCursor() {
        return { ...this.#e };
      }
      get segmentValues() {
        return { ...this.#t };
      }
      get segments() {
        return this.#s;
      }
      get separator() {
        return this.#r;
      }
      get formattedValue() {
        return this.#c(this.#t);
      }
      #c(t) {
        return this.#s.map((s) => t[s.type]).join(this.#r);
      }
      #a() {
        this._setUserInput(this.#c(this.#t)), this._setValue(N(this.#t) ?? void 0);
      }
      constructor(t) {
        const s = t.format ? { segments: P(t.format), separator: t.separator ?? "/" } : tt(t.locale), e2 = t.separator ?? s.separator, i = t.format ? P(t.format) : s.segments, n = t.initialValue ?? t.defaultValue, o = n ? { year: String(n.getUTCFullYear()).padStart(4, "0"), month: String(n.getUTCMonth() + 1).padStart(2, "0"), day: String(n.getUTCDate()).padStart(2, "0") } : { year: "____", month: "__", day: "__" }, u = i.map((a) => o[a.type]).join(e2);
        super({ ...t, initialUserInput: u }, false), this.#s = i, this.#r = e2, this.#t = o, this.#n = t.minDate, this.#u = t.maxDate, this.#a(), this.on("cursor", (a) => this.#d(a)), this.on("key", (a, l) => this.#f(a, l)), this.on("finalize", () => this.#g(t));
      }
      #h() {
        const t = Math.max(0, Math.min(this.#e.segmentIndex, this.#s.length - 1)), s = this.#s[t];
        if (s) return this.#e.positionInSegment = Math.max(0, Math.min(this.#e.positionInSegment, s.len - 1)), { segment: s, index: t };
      }
      #l(t) {
        this.inlineError = "", this.#o = null;
        const s = this.#h();
        s && (this.#e.segmentIndex = Math.max(0, Math.min(this.#s.length - 1, s.index + t)), this.#e.positionInSegment = 0, this.#i = true);
      }
      #p(t) {
        const s = this.#h();
        if (!s) return;
        const { segment: e2 } = s, i = this.#t[e2.type], n = !i || i.replace(/_/g, "") === "", o = Number.parseInt((i || "0").replace(/_/g, "0"), 10) || 0, u = st(e2.type, S(this.#t), this.#n, this.#u);
        let a;
        n ? a = t === 1 ? u.min : u.max : a = Math.max(Math.min(u.max, o + t), u.min), this.#t = { ...this.#t, [e2.type]: a.toString().padStart(e2.len, "0") }, this.#i = true, this.#o = null, this.#a();
      }
      #d(t) {
        if (t) switch (t) {
          case "right":
            return this.#l(1);
          case "left":
            return this.#l(-1);
          case "up":
            return this.#p(1);
          case "down":
            return this.#p(-1);
        }
      }
      #f(t, s) {
        if (s?.name === "backspace" || s?.sequence === "\x7F" || s?.sequence === "\b" || t === "\x7F" || t === "\b") {
          this.inlineError = "";
          const e2 = this.#h();
          if (!e2) return;
          if (!this.#t[e2.segment.type].replace(/_/g, "")) {
            this.#l(-1);
            return;
          }
          this.#t[e2.segment.type] = "_".repeat(e2.segment.len), this.#i = true, this.#e.positionInSegment = 0, this.#a();
          return;
        }
        if (s?.name === "tab") {
          this.inlineError = "";
          const e2 = this.#h();
          if (!e2) return;
          const i = s.shift ? -1 : 1, n = e2.index + i;
          n >= 0 && n < this.#s.length && (this.#e.segmentIndex = n, this.#e.positionInSegment = 0, this.#i = true);
          return;
        }
        if (t && /^[0-9]$/.test(t)) {
          const e2 = this.#h();
          if (!e2) return;
          const { segment: i } = e2, n = !this.#t[i.type].replace(/_/g, "");
          if (this.#i && this.#o !== null && !n) {
            const d = this.#o + t, g = { ...this.#t, [i.type]: d }, _ = this.#m(g, i);
            if (_) {
              this.inlineError = _, this.#o = null, this.#i = false;
              return;
            }
            this.inlineError = "", this.#t[i.type] = d, this.#o = null, this.#i = false, this.#a(), e2.index < this.#s.length - 1 && (this.#e.segmentIndex = e2.index + 1, this.#e.positionInSegment = 0, this.#i = true);
            return;
          }
          this.#i && !n && (this.#t[i.type] = "_".repeat(i.len), this.#e.positionInSegment = 0), this.#i = false, this.#o = null;
          const o = this.#t[i.type], u = o.indexOf("_"), a = u >= 0 ? u : Math.min(this.#e.positionInSegment, i.len - 1);
          if (a < 0 || a >= i.len) return;
          let l = o.slice(0, a) + t + o.slice(a + 1), c = false;
          if (a === 0 && o === "__" && (i.type === "month" || i.type === "day")) {
            const d = Number.parseInt(t, 10);
            l = `0${t}`, c = d <= (i.type === "month" ? 1 : 2);
          }
          if (i.type === "year" && (l = (o.replace(/_/g, "") + t).padStart(i.len, "_")), !l.includes("_")) {
            const d = { ...this.#t, [i.type]: l }, g = this.#m(d, i);
            if (g) {
              this.inlineError = g;
              return;
            }
          }
          this.inlineError = "", this.#t[i.type] = l;
          const y = l.includes("_") ? void 0 : F(this.#t);
          if (y) {
            const { year: d, month: g } = y, _ = U(d, g);
            this.#t = { year: String(Math.max(0, Math.min(9999, d))).padStart(4, "0"), month: String(Math.max(1, Math.min(12, g))).padStart(2, "0"), day: String(Math.max(1, Math.min(_, y.day))).padStart(2, "0") };
          }
          this.#a();
          const T = l.indexOf("_");
          c ? (this.#i = true, this.#o = t) : T >= 0 ? this.#e.positionInSegment = T : u >= 0 && e2.index < this.#s.length - 1 ? (this.#e.segmentIndex = e2.index + 1, this.#e.positionInSegment = 0, this.#i = true) : this.#e.positionInSegment = Math.min(a + 1, i.len - 1);
        }
      }
      #m(t, s) {
        const { month: e2, day: i } = S(t);
        if (s.type === "month" && (e2 < 0 || e2 > 12)) return h.date.messages.invalidMonth;
        if (s.type === "day" && (i < 0 || i > 31)) return h.date.messages.invalidDay(31, "any month");
      }
      #g(t) {
        const { year: s, month: e2, day: i } = S(this.#t);
        if (s && e2 && i) {
          const n = U(s, e2);
          this.#t = { ...this.#t, day: String(Math.min(i, n)).padStart(2, "0") };
        }
        this.value = N(this.#t) ?? t.defaultValue ?? void 0;
      }
    };
    it = class extends m {
      options;
      cursor = 0;
      #s;
      getGroupItems(t) {
        return this.options.filter((s) => s.group === t);
      }
      isGroupSelected(t) {
        const s = this.getGroupItems(t), e2 = this.value;
        return e2 === void 0 ? false : s.every((i) => e2.includes(i.value));
      }
      toggleValue() {
        const t = this.options[this.cursor];
        if (this.value === void 0 && (this.value = []), t.group === true) {
          const s = t.value, e2 = this.getGroupItems(s);
          this.isGroupSelected(s) ? this.value = this.value.filter((i) => e2.findIndex((n) => n.value === i) === -1) : this.value = [...this.value, ...e2.map((i) => i.value)], this.value = Array.from(new Set(this.value));
        } else {
          const s = this.value.includes(t.value);
          this.value = s ? this.value.filter((e2) => e2 !== t.value) : [...this.value, t.value];
        }
      }
      constructor(t) {
        super(t, false);
        const { options: s } = t;
        this.#s = t.selectableGroups !== false, this.options = Object.entries(s).flatMap(([e2, i]) => [{ value: e2, group: true, label: e2 }, ...i.map((n) => ({ ...n, group: e2 }))]), this.value = [...t.initialValues ?? []], this.cursor = Math.max(this.options.findIndex(({ value: e2 }) => e2 === t.cursorAt), this.#s ? 0 : 1), this.on("cursor", (e2) => {
          switch (e2) {
            case "left":
            case "up": {
              this.cursor = this.cursor === 0 ? this.options.length - 1 : this.cursor - 1;
              const i = this.options[this.cursor]?.group === true;
              !this.#s && i && (this.cursor = this.cursor === 0 ? this.options.length - 1 : this.cursor - 1);
              break;
            }
            case "down":
            case "right": {
              this.cursor = this.cursor === this.options.length - 1 ? 0 : this.cursor + 1;
              const i = this.options[this.cursor]?.group === true;
              !this.#s && i && (this.cursor = this.cursor === this.options.length - 1 ? 0 : this.cursor + 1);
              break;
            }
            case "space":
              this.toggleValue();
              break;
          }
        });
      }
    };
    rt = class extends m {
      #s = false;
      #r;
      focused = "editor";
      get userInputWithCursor() {
        if (this.state === "submit") return this.userInput;
        const t = this.userInput;
        if (this.cursor >= t.length) return `${t}\u2588`;
        const s = t.slice(0, this.cursor), e2 = t[this.cursor], i = t.slice(this.cursor + 1);
        return e2 === `
` ? `${s}\u2588
${i}` : `${s}${v("inverse", e2)}${i}`;
      }
      get cursor() {
        return this._cursor;
      }
      #t(t) {
        if (this.userInput.length === 0) {
          this._setUserInput(t);
          return;
        }
        this._setUserInput(this.userInput.slice(0, this.cursor) + t + this.userInput.slice(this.cursor));
      }
      #n(t) {
        const s = this.value ?? "";
        switch (t) {
          case "up":
            this._cursor = I(this._cursor, 0, -1, s);
            return;
          case "down":
            this._cursor = I(this._cursor, 0, 1, s);
            return;
          case "left":
            this._cursor = I(this._cursor, -1, 0, s);
            return;
          case "right":
            this._cursor = I(this._cursor, 1, 0, s);
            return;
        }
      }
      _shouldSubmit(t, s) {
        if (this.#r) return this.focused === "submit" ? true : (this.#t(`
`), this._cursor++, false);
        const e2 = this.#s;
        return this.#s = true, e2 ? (this.userInput[this.cursor - 1] === `
` && (this._setUserInput(this.userInput.slice(0, this.cursor - 1) + this.userInput.slice(this.cursor)), this._cursor--), true) : (this.#t(`
`), this._cursor++, false);
      }
      constructor(t) {
        super(t, false), this.#r = t.showSubmit ?? false, this.on("key", (s, e2) => {
          if (e2?.name && h.actions.has(e2.name)) {
            this.#n(e2.name);
            return;
          }
          if (s === "	" && this.#r) {
            this.focused = this.focused === "editor" ? "submit" : "editor";
            return;
          }
          if (e2?.name !== "return") {
            if (this.#s = false, e2?.name === "backspace" && this.cursor > 0) {
              this._setUserInput(this.userInput.slice(0, this.cursor - 1) + this.userInput.slice(this.cursor)), this._cursor--;
              return;
            }
            if (e2?.name === "delete" && this.cursor < this.userInput.length) {
              this._setUserInput(this.userInput.slice(0, this.cursor) + this.userInput.slice(this.cursor + 1));
              return;
            }
            s && (this.#r && this.focused === "submit" && (this.focused = "editor"), this.#t(s ?? ""), this._cursor++);
          }
        }), this.on("userInput", (s) => {
          this._setValue(s);
        }), this.on("finalize", () => {
          this.value || (this.value = t.defaultValue), this.value === void 0 && (this.value = "");
        });
      }
    };
    nt = class extends m {
      options;
      cursor = 0;
      get _value() {
        return this.options[this.cursor].value;
      }
      get _enabledOptions() {
        return this.options.filter((t) => t.disabled !== true);
      }
      toggleAll() {
        const t = this._enabledOptions, s = this.value !== void 0 && this.value.length === t.length;
        this.value = s ? [] : t.map((e2) => e2.value);
      }
      toggleInvert() {
        const t = this.value;
        if (!t) return;
        const s = this._enabledOptions.filter((e2) => !t.includes(e2.value));
        this.value = s.map((e2) => e2.value);
      }
      toggleValue() {
        this.value === void 0 && (this.value = []);
        const t = this.value.includes(this._value);
        this.value = t ? this.value.filter((s) => s !== this._value) : [...this.value, this._value];
      }
      constructor(t) {
        super(t, false), this.options = t.options, this.value = [...t.initialValues ?? []];
        const s = Math.max(this.options.findIndex(({ value: e2 }) => e2 === t.cursorAt), 0);
        this.cursor = this.options[s].disabled ? f(s, 1, this.options) : s, this.on("key", (e2) => {
          e2 === "a" && this.toggleAll(), e2 === "i" && this.toggleInvert();
        }), this.on("cursor", (e2) => {
          switch (e2) {
            case "left":
            case "up":
              this.cursor = f(this.cursor, -1, this.options);
              break;
            case "down":
            case "right":
              this.cursor = f(this.cursor, 1, this.options);
              break;
            case "space":
              this.toggleValue();
              break;
          }
        });
      }
    };
    ot = class extends m {
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
    ut = class extends m {
      options;
      cursor = 0;
      get _selectedValue() {
        return this.options[this.cursor];
      }
      changeValue() {
        this.value = this._selectedValue.value;
      }
      constructor(t) {
        super(t, false), this.options = t.options;
        const s = this.options.findIndex(({ value: i }) => i === t.initialValue), e2 = s === -1 ? 0 : s;
        this.cursor = this.options[e2].disabled ? f(e2, 1, this.options) : e2, this.changeValue(), this.on("cursor", (i) => {
          switch (i) {
            case "left":
            case "up":
              this.cursor = f(this.cursor, -1, this.options);
              break;
            case "down":
            case "right":
              this.cursor = f(this.cursor, 1, this.options);
              break;
          }
          this.changeValue();
        });
      }
    };
    at = class extends m {
      options;
      cursor = 0;
      constructor(t) {
        super(t, false), this.options = t.options;
        const s = t.caseSensitive === true, e2 = this.options.map(({ value: [i] }) => s ? i : i?.toLowerCase());
        this.cursor = Math.max(e2.indexOf(t.initialValue), 0), this.on("key", (i, n) => {
          if (!i) return;
          const o = s && n.shift ? i.toUpperCase() : i;
          if (!e2.includes(o)) return;
          const u = this.options.find(({ value: [a] }) => s ? a === o : a?.toLowerCase() === i);
          u && (this.value = u.value, this.state = "submit", this.emit("submit"));
        });
      }
    };
    ht = class extends m {
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
  }
});

// node_modules/@clack/prompts/dist/index.mjs
var dist_exports = {};
__export(dist_exports, {
  S_BAR: () => $2,
  S_BAR_END: () => x2,
  S_BAR_END_RIGHT: () => xt,
  S_BAR_H: () => st2,
  S_BAR_START: () => lt,
  S_BAR_START_RIGHT: () => _t,
  S_CHECKBOX_ACTIVE: () => et2,
  S_CHECKBOX_INACTIVE: () => Y2,
  S_CHECKBOX_SELECTED: () => K2,
  S_CONNECT_LEFT: () => Gt,
  S_CORNER_BOTTOM_LEFT: () => dt,
  S_CORNER_BOTTOM_RIGHT: () => $t,
  S_CORNER_TOP_LEFT: () => Mt,
  S_CORNER_TOP_RIGHT: () => ct,
  S_ERROR: () => gt,
  S_INFO: () => ht2,
  S_PASSWORD_MASK: () => Et,
  S_RADIO_ACTIVE: () => z2,
  S_RADIO_INACTIVE: () => U2,
  S_STEP_ACTIVE: () => Tt,
  S_STEP_CANCEL: () => at2,
  S_STEP_ERROR: () => ut2,
  S_STEP_SUBMIT: () => H2,
  S_SUCCESS: () => pt,
  S_WARN: () => mt,
  autocomplete: () => At,
  autocompleteMultiselect: () => ie,
  box: () => ae,
  cancel: () => me,
  confirm: () => ue,
  date: () => le,
  group: () => he,
  groupMultiselect: () => pe,
  intro: () => ge,
  isCI: () => ot2,
  isCancel: () => q,
  isTTY: () => It,
  limitOptions: () => F2,
  log: () => R2,
  multiline: () => fe,
  multiselect: () => ve,
  note: () => Se,
  outro: () => ye,
  password: () => Ce,
  path: () => Ie,
  progress: () => _e,
  select: () => xe,
  selectKey: () => Ee,
  settings: () => h,
  spinner: () => ft,
  stream: () => q2,
  symbol: () => P2,
  symbolBar: () => yt,
  taskLog: () => Oe,
  tasks: () => Ge,
  text: () => Pe,
  unicode: () => tt2,
  unicodeOr: () => w2,
  updateSettings: () => j
});
import { styleText as e, stripVTControlCharacters as nt2 } from "node:util";
import V2 from "node:process";
import { existsSync as Qt, lstatSync as wt, readdirSync as Zt } from "node:fs";
import { dirname as bt, join as te } from "node:path";
function ee() {
  return V2.platform !== "win32" ? V2.env.TERM !== "linux" : !!V2.env.CI || !!V2.env.WT_SESSION || !!V2.env.TERMINUS_SUBLIME || V2.env.ConEmuTask === "{cmd::Cmder}" || V2.env.TERM_PROGRAM === "Terminus-Sublime" || V2.env.TERM_PROGRAM === "vscode" || V2.env.TERM === "xterm-256color" || V2.env.TERM === "alacritty" || V2.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
function Pt(t) {
  return t.label ?? String(t.value ?? "");
}
function Rt(t, i) {
  if (!t) return true;
  const s = (i.label ?? String(i.value ?? "")).toLowerCase(), r = (i.hint ?? "").toLowerCase(), u = String(i.value).toLowerCase(), n = t.toLowerCase();
  return s.includes(n) || r.includes(n) || u.includes(n);
}
function se(t, i) {
  const s = [];
  for (const r of i) t.includes(r.value) && s.push(r);
  return s;
}
function Vt(t, i, s, r) {
  let u = s, n = s;
  return r === "center" ? u = Math.floor((i - t) / 2) : r === "right" && (u = i - t - s), n = i - u - t, [u, n];
}
function ce(t, i) {
  const s = t.segmentValues, r = t.segmentCursor;
  if (i === "submit" || i === "cancel") return t.formattedValue;
  const u = e("gray", t.separator);
  return t.segments.map((n, a) => {
    const c = a === r.segmentIndex && !["submit", "cancel"].includes(i), o = de[n.type];
    return $e(s[n.type], { isActive: c, label: o });
  }).join(u);
}
function $e(t, i) {
  const s = !t || t.replace(/_/g, "") === "";
  return i.isActive ? e("inverse", s ? i.label : t.replace(/_/g, " ")) : s ? e("dim", i.label) : t.replace(/_/g, e("dim", " "));
}
function _e({ style: t = "heavy", max: i = 100, size: s = 40, ...r } = {}) {
  const u = ft(r);
  let n = 0, a = "";
  const c = Math.max(1, i), o = Math.max(1, s), l = (f2) => {
    switch (f2) {
      case "initial":
      case "active":
        return (h2) => e("magenta", h2);
      case "error":
      case "cancel":
        return (h2) => e("red", h2);
      case "submit":
        return (h2) => e("green", h2);
      default:
        return (h2) => e("magenta", h2);
    }
  }, d = (f2, h2) => {
    const I2 = Math.floor(n / c * o);
    return `${l(f2)(jt[t].repeat(I2))}${e("dim", jt[t].repeat(o - I2))} ${h2}`;
  }, g = (f2 = "") => {
    a = f2, u.start(d("initial", f2));
  }, p2 = (f2 = 1, h2) => {
    n = Math.min(c, f2 + n), u.message(d("active", h2 ?? a)), a = h2 ?? a;
  };
  return { start: g, stop: u.stop, cancel: u.cancel, error: u.error, clear: u.clear, advance: p2, isCancelled: u.isCancelled, message: (f2) => p2(0, f2) };
}
var import_sisteransi2, tt2, ot2, It, w2, Tt, at2, ut2, H2, lt, $2, x2, _t, xt, z2, U2, et2, K2, Y2, Et, st2, ct, Gt, $t, dt, Mt, ht2, pt, mt, gt, P2, yt, Ot, F2, At, ie, re, ne, oe, ae, ue, le, de, he, pe, R2, me, ge, ye, fe, Q2, ve, we, be, Se, Ce, Ie, Te, ft, jt, it2, xe, Ee, Nt, q2, Ge, Me, Oe, Pe;
var init_dist4 = __esm({
  "node_modules/@clack/prompts/dist/index.mjs"() {
    init_dist3();
    init_dist3();
    init_main();
    init_dist2();
    import_sisteransi2 = __toESM(require_src(), 1);
    tt2 = ee();
    ot2 = () => process.env.CI === "true";
    It = (t) => t.isTTY === true;
    w2 = (t, i) => tt2 ? t : i;
    Tt = w2("\u25C6", "*");
    at2 = w2("\u25A0", "x");
    ut2 = w2("\u25B2", "x");
    H2 = w2("\u25C7", "o");
    lt = w2("\u250C", "T");
    $2 = w2("\u2502", "|");
    x2 = w2("\u2514", "\u2014");
    _t = w2("\u2510", "T");
    xt = w2("\u2518", "\u2014");
    z2 = w2("\u25CF", ">");
    U2 = w2("\u25CB", " ");
    et2 = w2("\u25FB", "[\u2022]");
    K2 = w2("\u25FC", "[+]");
    Y2 = w2("\u25FB", "[ ]");
    Et = w2("\u25AA", "\u2022");
    st2 = w2("\u2500", "-");
    ct = w2("\u256E", "+");
    Gt = w2("\u251C", "+");
    $t = w2("\u256F", "+");
    dt = w2("\u2570", "+");
    Mt = w2("\u256D", "+");
    ht2 = w2("\u25CF", "\u2022");
    pt = w2("\u25C6", "*");
    mt = w2("\u25B2", "!");
    gt = w2("\u25A0", "x");
    P2 = (t) => {
      switch (t) {
        case "initial":
        case "active":
          return e("cyan", Tt);
        case "cancel":
          return e("red", at2);
        case "error":
          return e("yellow", ut2);
        case "submit":
          return e("green", H2);
      }
    };
    yt = (t) => {
      switch (t) {
        case "initial":
        case "active":
          return e("cyan", $2);
        case "cancel":
          return e("red", $2);
        case "error":
          return e("yellow", $2);
        case "submit":
          return e("green", $2);
      }
    };
    Ot = (t, i, s, r, u, n = false) => {
      let a = i, c = 0;
      if (n) for (let o = r - 1; o >= s && (a -= t[o].length, c++, !(a <= u)); o--) ;
      else for (let o = s; o < r && (a -= t[o].length, c++, !(a <= u)); o++) ;
      return { lineCount: a, removals: c };
    };
    F2 = ({ cursor: t, options: i, style: s, output: r = process.stdout, maxItems: u = Number.POSITIVE_INFINITY, columnPadding: n = 0, rowPadding: a = 4 }) => {
      const c = A(r) - n, o = L(r), l = e("dim", "..."), d = Math.max(o - a, 0), g = Math.max(Math.min(u, d), 5);
      let p2 = 0;
      t >= g - 3 && (p2 = Math.max(Math.min(t - g + 3, i.length - g), 0));
      let f2 = g < i.length && p2 > 0, h2 = g < i.length && p2 + g < i.length;
      const I2 = Math.min(p2 + g, i.length), m2 = [];
      let y = 0;
      f2 && y++, h2 && y++;
      const v2 = p2 + (f2 ? 1 : 0), C2 = I2 - (h2 ? 1 : 0);
      for (let b2 = v2; b2 < C2; b2++) {
        const G2 = wrapAnsi(s(i[b2], b2 === t), c, { hard: true, trim: false }).split(`
`);
        m2.push(G2), y += G2.length;
      }
      if (y > d) {
        let b2 = 0, G2 = 0, M = y;
        const N2 = t - v2;
        let O2 = d;
        const j2 = () => Ot(m2, M, 0, N2, O2), k2 = () => Ot(m2, M, N2 + 1, m2.length, O2, true);
        f2 ? ({ lineCount: M, removals: b2 } = j2(), M > O2 && (h2 || (O2 -= 1), { lineCount: M, removals: G2 } = k2())) : (h2 || (O2 -= 1), { lineCount: M, removals: G2 } = k2(), M > O2 && (O2 -= 1, { lineCount: M, removals: b2 } = j2())), b2 > 0 && (f2 = true, m2.splice(0, b2)), G2 > 0 && (h2 = true, m2.splice(m2.length - G2, G2));
      }
      const S2 = [];
      f2 && S2.push(l);
      for (const b2 of m2) for (const G2 of b2) S2.push(G2);
      return h2 && S2.push(l), S2;
    };
    At = (t) => new Q({ options: t.options, initialValue: t.initialValue ? [t.initialValue] : void 0, initialUserInput: t.initialUserInput, placeholder: t.placeholder, filter: t.filter ?? ((i, s) => Rt(i, s)), signal: t.signal, input: t.input, output: t.output, validate: t.validate, render() {
      const i = t.withGuide ?? h.withGuide, s = i ? [`${e("gray", $2)}`, `${P2(this.state)}  ${t.message}`] : [`${P2(this.state)}  ${t.message}`], r = this.userInput, u = this.options, n = t.placeholder, a = r === "" && n !== void 0, c = (o, l) => {
        const d = Pt(o), g = o.hint && o.value === this.focusedValue ? e("dim", ` (${o.hint})`) : "";
        switch (l) {
          case "active":
            return `${e("green", z2)} ${d}${g}`;
          case "inactive":
            return `${e("dim", U2)} ${e("dim", d)}`;
          case "disabled":
            return `${e("gray", U2)} ${e(["strikethrough", "gray"], d)}`;
        }
      };
      switch (this.state) {
        case "submit": {
          const o = se(this.selectedValues, u), l = o.length > 0 ? `  ${e("dim", o.map(Pt).join(", "))}` : "", d = i ? e("gray", $2) : "";
          return `${s.join(`
`)}
${d}${l}`;
        }
        case "cancel": {
          const o = r ? `  ${e(["strikethrough", "dim"], r)}` : "", l = i ? e("gray", $2) : "";
          return `${s.join(`
`)}
${l}${o}`;
        }
        default: {
          const o = this.state === "error" ? "yellow" : "cyan", l = i ? `${e(o, $2)}  ` : "", d = i ? e(o, x2) : "";
          let g = "";
          if (this.isNavigating || a) {
            const v2 = a ? n : r;
            g = v2 !== "" ? ` ${e("dim", v2)}` : "";
          } else g = ` ${this.userInputWithCursor}`;
          const p2 = this.filteredOptions.length !== u.length ? e("dim", ` (${this.filteredOptions.length} match${this.filteredOptions.length === 1 ? "" : "es"})`) : "", f2 = this.filteredOptions.length === 0 && r ? [`${l}${e("yellow", "No matches found")}`] : [], h2 = this.state === "error" ? [`${l}${e("yellow", this.error)}`] : [];
          i && s.push(`${l.trimEnd()}`), s.push(`${l}${e("dim", "Search:")}${g}${p2}`, ...f2, ...h2);
          const I2 = [`${e("dim", "\u2191/\u2193")} to select`, `${e("dim", "Enter:")} confirm`, `${e("dim", "Type:")} to search`], m2 = [`${l}${I2.join(" \u2022 ")}`, d], y = this.filteredOptions.length === 0 ? [] : F2({ cursor: this.cursor, options: this.filteredOptions, columnPadding: i ? 3 : 0, rowPadding: s.length + m2.length, style: (v2, C2) => c(v2, v2.disabled ? "disabled" : C2 ? "active" : "inactive"), maxItems: t.maxItems, output: t.output });
          return [...s, ...y.map((v2) => `${l}${v2}`), ...m2].join(`
`);
        }
      }
    } }).prompt();
    ie = (t) => {
      const i = (r, u, n, a) => {
        const c = n.includes(r.value), o = r.label ?? String(r.value ?? ""), l = r.hint && a !== void 0 && r.value === a ? e("dim", ` (${r.hint})`) : "", d = c ? e("green", K2) : e("dim", Y2);
        return r.disabled ? `${e("gray", Y2)} ${e(["strikethrough", "gray"], o)}` : u ? `${d} ${o}${l}` : `${d} ${e("dim", o)}`;
      }, s = new Q({ options: t.options, multiple: true, placeholder: t.placeholder, filter: t.filter ?? ((r, u) => Rt(r, u)), validate: () => {
        if (t.required && s.selectedValues.length === 0) return "Please select at least one item";
      }, initialValue: t.initialValues, signal: t.signal, input: t.input, output: t.output, render() {
        const r = t.withGuide ?? h.withGuide, u = `${r ? `${e("gray", $2)}
` : ""}${P2(this.state)}  ${t.message}
`, n = this.userInput, a = t.placeholder, c = n === "" && a !== void 0, o = this.isNavigating || c ? e("dim", c ? a : n) : this.userInputWithCursor, l = this.options, d = this.filteredOptions.length !== l.length ? e("dim", ` (${this.filteredOptions.length} match${this.filteredOptions.length === 1 ? "" : "es"})`) : "";
        switch (this.state) {
          case "submit":
            return `${u}${r ? `${e("gray", $2)}  ` : ""}${e("dim", `${this.selectedValues.length} items selected`)}`;
          case "cancel":
            return `${u}${r ? `${e("gray", $2)}  ` : ""}${e(["strikethrough", "dim"], n)}`;
          default: {
            const g = this.state === "error" ? "yellow" : "cyan", p2 = r ? `${e(g, $2)}  ` : "", f2 = r ? e(g, x2) : "", h2 = [`${e("dim", "\u2191/\u2193")} to navigate`, `${e("dim", this.isNavigating ? "Space/Tab:" : "Tab:")} select`, `${e("dim", "Enter:")} confirm`, `${e("dim", "Type:")} to search`], I2 = this.filteredOptions.length === 0 && n ? [`${p2}${e("yellow", "No matches found")}`] : [], m2 = this.state === "error" ? [`${p2}${e("yellow", this.error)}`] : [], y = [...`${u}${r ? e(g, $2) : ""}`.split(`
`), `${p2}${e("dim", "Search:")} ${o}${d}`, ...I2, ...m2], v2 = [`${p2}${h2.join(" \u2022 ")}`, f2], C2 = F2({ cursor: this.cursor, options: this.filteredOptions, style: (S2, b2) => i(S2, b2, this.selectedValues, this.focusedValue), maxItems: t.maxItems, output: t.output, rowPadding: y.length + v2.length });
            return [...y, ...C2.map((S2) => `${p2}${S2}`), ...v2].join(`
`);
          }
        }
      } });
      return s.prompt();
    };
    re = [Mt, ct, dt, $t];
    ne = [lt, _t, x2, xt];
    oe = (t) => t;
    ae = (t = "", i = "", s) => {
      const r = s?.output ?? process.stdout, u = A(r), n = 2, a = s?.titlePadding ?? 1, c = s?.contentPadding ?? 2, o = s?.width === void 0 || s.width === "auto" ? 1 : Math.min(1, s.width), l = s?.withGuide ?? h.withGuide ? `${$2} ` : "", d = s?.formatBorder ?? oe, g = (s?.rounded ? re : ne).map(d), p2 = d(st2), f2 = d($2), h2 = dist_default2(l), I2 = dist_default2(i), m2 = u - h2;
      let y = Math.floor(u * o) - h2;
      if (s?.width === "auto") {
        const O2 = t.split(`
`);
        let j2 = I2 + a * 2;
        for (const rt2 of O2) {
          const W2 = dist_default2(rt2) + c * 2;
          W2 > j2 && (j2 = W2);
        }
        const k2 = j2 + n;
        k2 < y && (y = k2);
      }
      y % 2 !== 0 && (y < m2 ? y++ : y--);
      const v2 = y - n, C2 = v2 - a * 2, S2 = I2 > C2 ? `${i.slice(0, C2 - 3)}...` : i, [b2, G2] = Vt(dist_default2(S2), v2, a, s?.titleAlign), M = wrapAnsi(t, v2 - c * 2, { hard: true, trim: false });
      r.write(`${l}${g[0]}${p2.repeat(b2)}${S2}${p2.repeat(G2)}${g[1]}
`);
      const N2 = M.split(`
`);
      for (const O2 of N2) {
        const [j2, k2] = Vt(dist_default2(O2), v2, c, s?.contentAlign);
        r.write(`${l}${f2}${" ".repeat(j2)}${O2}${" ".repeat(k2)}${f2}
`);
      }
      r.write(`${l}${g[2]}${p2.repeat(v2)}${g[3]}
`);
    };
    ue = (t) => {
      const i = t.active ?? "Yes", s = t.inactive ?? "No";
      return new X({ active: i, inactive: s, signal: t.signal, input: t.input, output: t.output, initialValue: t.initialValue ?? true, render() {
        const r = t.withGuide ?? h.withGuide, u = `${P2(this.state)}  `, n = r ? `${e("gray", $2)}  ` : "", a = W(t.output, t.message, n, u), c = `${r ? `${e("gray", $2)}
` : ""}${a}
`, o = this.value ? i : s;
        switch (this.state) {
          case "submit": {
            const l = r ? `${e("gray", $2)}  ` : "";
            return `${c}${l}${e("dim", o)}`;
          }
          case "cancel": {
            const l = r ? `${e("gray", $2)}  ` : "";
            return `${c}${l}${e(["strikethrough", "dim"], o)}${r ? `
${e("gray", $2)}` : ""}`;
          }
          default: {
            const l = r ? `${e("cyan", $2)}  ` : "", d = r ? e("cyan", x2) : "";
            return `${c}${l}${this.value ? `${e("green", z2)} ${i}` : `${e("dim", U2)} ${e("dim", i)}`}${t.vertical ? r ? `
${e("cyan", $2)}  ` : `
` : ` ${e("dim", "/")} `}${this.value ? `${e("dim", U2)} ${e("dim", s)}` : `${e("green", z2)} ${s}`}
${d}
`;
          }
        }
      } }).prompt();
    };
    le = (t) => {
      const i = t.validate;
      return new et({ ...t, validate(s) {
        if (s === void 0) return t.defaultValue !== void 0 ? void 0 : i ? i(s) : h.date.messages.required;
        const r = (u) => u.toISOString().slice(0, 10);
        if (t.minDate && r(s) < r(t.minDate)) return h.date.messages.afterMin(t.minDate);
        if (t.maxDate && r(s) > r(t.maxDate)) return h.date.messages.beforeMax(t.maxDate);
        if (i) return i(s);
      }, render() {
        const s = (t?.withGuide ?? h.withGuide) !== false, r = `${`${s ? `${e("gray", $2)}
` : ""}${P2(this.state)}  `}${t.message}
`, u = this.state !== "initial" ? this.state : "active", n = ce(this, u), a = this.value instanceof Date ? this.formattedValue : "";
        switch (this.state) {
          case "error": {
            const c = this.error ? `  ${e("yellow", this.error)}` : "", o = s ? `${e("yellow", $2)}  ` : "", l = s ? e("yellow", x2) : "";
            return `${r.trim()}
${o}${n}
${l}${c}
`;
          }
          case "submit": {
            const c = a ? `  ${e("dim", a)}` : "", o = s ? e("gray", $2) : "";
            return `${r}${o}${c}`;
          }
          case "cancel": {
            const c = a ? `  ${e(["strikethrough", "dim"], a)}` : "", o = s ? e("gray", $2) : "";
            return `${r}${o}${c}${a.trim() ? `
${o}` : ""}`;
          }
          default: {
            const c = s ? `${e("cyan", $2)}  ` : "", o = s ? e("cyan", x2) : "", l = s ? `${e("cyan", $2)}  ` : "", d = this.inlineError ? `
${l}${e("yellow", this.inlineError)}` : "";
            return `${r}${c}${n}${d}
${o}
`;
          }
        }
      } }).prompt();
    };
    de = { year: "yyyy", month: "mm", day: "dd" };
    he = async (t, i) => {
      const s = {}, r = Object.keys(t);
      for (const u of r) {
        const n = t[u], a = await n({ results: s })?.catch((c) => {
          throw c;
        });
        if (typeof i?.onCancel == "function" && q(a)) {
          s[u] = "canceled", i.onCancel({ results: s });
          continue;
        }
        s[u] = a;
      }
      return s;
    };
    pe = (t) => {
      const { selectableGroups: i = true, groupSpacing: s = 0 } = t, r = (n, a, c = []) => {
        const o = n.label ?? String(n.value), l = typeof n.group == "string", d = l && (c[c.indexOf(n) + 1] ?? { group: true }), g = l && d && d.group === true;
        let p2 = "", f2 = "";
        l && (i ? (p2 = g ? `${x2} ` : `${$2} `, f2 = g ? "  " : `${$2} `) : p2 = "  ");
        let h2 = "";
        if (s > 0 && !l && (h2 = `
`.repeat(s)), a === "active") return W(t.output, `${o}${n.hint ? ` ${e("dim", `(${n.hint})`)}` : ""}`, `${h2}${e("dim", p2)} `, `${h2}${e("dim", p2)}${e("cyan", et2)} `, `${h2}${e("dim", f2)} `);
        if (a === "group-active") return W(t.output, o, `${h2}${p2} `, `${h2}${p2}${e("cyan", et2)} `, `${h2}${f2} `, (m2) => e("dim", m2));
        if (a === "group-active-selected") return W(t.output, o, `${h2}${p2} `, `${h2}${p2}${e("green", K2)} `, `${h2}${f2} `, (m2) => e("dim", m2));
        if (a === "selected") {
          const m2 = l || i ? e("green", K2) : "";
          return W(t.output, `${o}${n.hint ? ` (${n.hint})` : ""}`, `${h2}${e("dim", p2)} `, `${h2}${e("dim", p2)}${m2} `, `${h2}${e("dim", f2)} `, (y) => e("dim", y));
        }
        if (a === "cancelled") return `${e(["strikethrough", "dim"], o)}`;
        if (a === "active-selected") return W(t.output, `${o}${n.hint ? ` ${e("dim", `(${n.hint})`)}` : ""}`, `${h2}${e("dim", p2)} `, `${h2}${e("dim", p2)}${e("green", K2)} `, `${h2}${e("dim", f2)} `);
        if (a === "submitted") return `${e("dim", o)}`;
        const I2 = l || i ? e("dim", Y2) : "";
        return W(t.output, o, `${h2}${e("dim", p2)} `, `${h2}${e("dim", p2)}${I2} `, `${h2}${e("dim", f2)} `, (m2) => e("dim", m2));
      }, u = t.required ?? true;
      return new it({ options: t.options, signal: t.signal, input: t.input, output: t.output, initialValues: t.initialValues, required: u, cursorAt: t.cursorAt, selectableGroups: i, validate(n) {
        if (u && (n === void 0 || n.length === 0)) return `Please select at least one option.
${e("reset", e("dim", `Press ${e(["gray", "bgWhite", "inverse"], " space ")} to select, ${e("gray", e(["bgWhite", "inverse"], " enter "))} to submit`))}`;
      }, render() {
        const n = t.withGuide ?? h.withGuide, a = `${n ? `${e("gray", $2)}
` : ""}${P2(this.state)}  ${t.message}
`, c = this.value ?? [], o = (l, d) => {
          const g = this.options, p2 = c.includes(l.value) || l.group === true && this.isGroupSelected(`${l.value}`);
          return !d && typeof l.group == "string" && this.options[this.cursor].value === l.group ? r(l, p2 ? "group-active-selected" : "group-active", g) : d && p2 ? r(l, "active-selected", g) : p2 ? r(l, "selected", g) : r(l, d ? "active" : "inactive", g);
        };
        switch (this.state) {
          case "submit": {
            const l = this.options.filter(({ value: g }) => c.includes(g)).map((g) => r(g, "submitted")), d = l.length === 0 ? "" : `  ${l.join(e("dim", ", "))}`;
            return `${a}${n ? e("gray", $2) : ""}${d}`;
          }
          case "cancel": {
            const l = this.options.filter(({ value: d }) => c.includes(d)).map((d) => r(d, "cancelled")).join(e("dim", ", "));
            return `${a}${n ? `${e("gray", $2)}  ` : ""}${l.trim() ? `${l}${n ? `
${e("gray", $2)}` : ""}` : ""}`;
          }
          case "error": {
            const l = n ? `${e("yellow", $2)}  ` : "", d = this.error.split(`
`).map((h2, I2) => I2 === 0 ? `${n ? `${e("yellow", x2)}  ` : ""}${e("yellow", h2)}` : `   ${h2}`).join(`
`), g = a.split(`
`).length, p2 = d.split(`
`).length + 1, f2 = F2({ output: t.output, options: this.options, cursor: this.cursor, maxItems: t.maxItems, columnPadding: l.length, rowPadding: g + p2, style: o }).join(`
${l}`);
            return `${a}${l}${f2}
${d}
`;
          }
          default: {
            const l = n ? `${e("cyan", $2)}  ` : "", d = a.split(`
`).length, g = (n ? 1 : 0) + 1, p2 = F2({ output: t.output, options: this.options, cursor: this.cursor, maxItems: t.maxItems, columnPadding: l.length, rowPadding: d + g, style: o }).join(`
${l}`);
            return `${a}${l}${p2}
${n ? e("cyan", x2) : ""}
`;
          }
        }
      } }).prompt();
    };
    R2 = { message: (t = [], { symbol: i = e("gray", $2), secondarySymbol: s = e("gray", $2), output: r = process.stdout, spacing: u = 1, withGuide: n } = {}) => {
      const a = [], c = n ?? h.withGuide, o = c ? s : "", l = c ? `${i}  ` : "", d = c ? `${s}  ` : "";
      for (let p2 = 0; p2 < u; p2++) a.push(o);
      const g = Array.isArray(t) ? t : t.split(`
`);
      if (g.length > 0) {
        const [p2, ...f2] = g;
        p2.length > 0 ? a.push(`${l}${p2}`) : a.push(c ? i : "");
        for (const h2 of f2) h2.length > 0 ? a.push(`${d}${h2}`) : a.push(c ? s : "");
      }
      r.write(`${a.join(`
`)}
`);
    }, info: (t, i) => {
      R2.message(t, { ...i, symbol: e("blue", ht2) });
    }, success: (t, i) => {
      R2.message(t, { ...i, symbol: e("green", pt) });
    }, step: (t, i) => {
      R2.message(t, { ...i, symbol: e("green", H2) });
    }, warn: (t, i) => {
      R2.message(t, { ...i, symbol: e("yellow", mt) });
    }, warning: (t, i) => {
      R2.warn(t, i);
    }, error: (t, i) => {
      R2.message(t, { ...i, symbol: e("red", gt) });
    } };
    me = (t = "", i) => {
      const s = i?.output ?? process.stdout, r = i?.withGuide ?? h.withGuide ? `${e("gray", x2)}  ` : "";
      s.write(`${r}${e("red", t)}

`);
    };
    ge = (t = "", i) => {
      const s = i?.output ?? process.stdout, r = i?.withGuide ?? h.withGuide ? `${e("gray", lt)}  ` : "";
      s.write(`${r}${t}
`);
    };
    ye = (t = "", i) => {
      const s = i?.output ?? process.stdout, r = i?.withGuide ?? h.withGuide ? `${e("gray", $2)}
${e("gray", x2)}  ` : "";
      s.write(`${r}${t}

`);
    };
    fe = (t) => new rt({ validate: t.validate, placeholder: t.placeholder, defaultValue: t.defaultValue, initialValue: t.initialValue, showSubmit: t.showSubmit, output: t.output, signal: t.signal, input: t.input, render() {
      const i = t?.withGuide ?? h.withGuide, s = `${`${i ? `${e("gray", $2)}
` : ""}${P2(this.state)}  `}${t.message}
`, r = t.placeholder ? e("inverse", t.placeholder[0]) + e("dim", t.placeholder.slice(1)) : e(["inverse", "hidden"], "_"), u = this.userInput ? this.userInputWithCursor : r, n = this.value ?? "", a = t.showSubmit ? `
  ${e(this.focused === "submit" ? "cyan" : "dim", "[ submit ]")}` : "";
      switch (this.state) {
        case "error": {
          const c = `${e("yellow", $2)}  `, o = i ? W(t.output, u, c, void 0) : u, l = e("yellow", x2);
          return `${s}${o}
${l}  ${e("yellow", this.error)}${a}
`;
        }
        case "submit": {
          const c = `${e("gray", $2)}  `, o = i ? W(t.output, n, c, void 0, void 0, (l) => e("dim", l)) : n ? e("dim", n) : "";
          return `${s}${o}`;
        }
        case "cancel": {
          const c = `${e("gray", $2)}  `, o = i ? W(t.output, n, c, void 0, void 0, (l) => e(["strikethrough", "dim"], l)) : n ? e(["strikethrough", "dim"], n) : "";
          return `${s}${o}`;
        }
        default: {
          const c = i ? `${e("cyan", $2)}  ` : "", o = i ? e("cyan", x2) : "", l = i ? W(t.output, u, c) : u;
          return `${s}${l}
${o}${a}
`;
        }
      }
    } }).prompt();
    Q2 = (t, i) => t.split(`
`).map((s) => i(s)).join(`
`);
    ve = (t) => {
      const i = (r, u) => {
        const n = r.label ?? String(r.value);
        return u === "disabled" ? `${e("gray", Y2)} ${Q2(n, (a) => e(["strikethrough", "gray"], a))}${r.hint ? ` ${e("dim", `(${r.hint ?? "disabled"})`)}` : ""}` : u === "active" ? `${e("cyan", et2)} ${n}${r.hint ? ` ${e("dim", `(${r.hint})`)}` : ""}` : u === "selected" ? `${e("green", K2)} ${Q2(n, (a) => e("dim", a))}${r.hint ? ` ${e("dim", `(${r.hint})`)}` : ""}` : u === "cancelled" ? `${Q2(n, (a) => e(["strikethrough", "dim"], a))}` : u === "active-selected" ? `${e("green", K2)} ${n}${r.hint ? ` ${e("dim", `(${r.hint})`)}` : ""}` : u === "submitted" ? `${Q2(n, (a) => e("dim", a))}` : `${e("dim", Y2)} ${Q2(n, (a) => e("dim", a))}`;
      }, s = t.required ?? true;
      return new nt({ options: t.options, signal: t.signal, input: t.input, output: t.output, initialValues: t.initialValues, required: s, cursorAt: t.cursorAt, validate(r) {
        if (s && (r === void 0 || r.length === 0)) return `Please select at least one option.
${e("reset", e("dim", `Press ${e(["gray", "bgWhite", "inverse"], " space ")} to select, ${e("gray", e("bgWhite", e("inverse", " enter ")))} to submit`))}`;
      }, render() {
        const r = t.withGuide ?? h.withGuide, u = W(t.output, t.message, r ? `${yt(this.state)}  ` : "", `${P2(this.state)}  `), n = `${r ? `${e("gray", $2)}
` : ""}${u}
`, a = this.value ?? [], c = (o, l) => {
          if (o.disabled) return i(o, "disabled");
          const d = a.includes(o.value);
          return l && d ? i(o, "active-selected") : d ? i(o, "selected") : i(o, l ? "active" : "inactive");
        };
        switch (this.state) {
          case "submit": {
            const o = this.options.filter(({ value: d }) => a.includes(d)).map((d) => i(d, "submitted")).join(e("dim", ", ")) || e("dim", "none"), l = W(t.output, o, r ? `${e("gray", $2)}  ` : "");
            return `${n}${l}`;
          }
          case "cancel": {
            const o = this.options.filter(({ value: d }) => a.includes(d)).map((d) => i(d, "cancelled")).join(e("dim", ", "));
            if (o.trim() === "") return `${n}${e("gray", $2)}`;
            const l = W(t.output, o, r ? `${e("gray", $2)}  ` : "");
            return `${n}${l}${r ? `
${e("gray", $2)}` : ""}`;
          }
          case "error": {
            const o = r ? `${e("yellow", $2)}  ` : "", l = this.error.split(`
`).map((p2, f2) => f2 === 0 ? `${r ? `${e("yellow", x2)}  ` : ""}${e("yellow", p2)}` : `   ${p2}`).join(`
`), d = n.split(`
`).length, g = l.split(`
`).length + 1;
            return `${n}${o}${F2({ output: t.output, options: this.options, cursor: this.cursor, maxItems: t.maxItems, columnPadding: o.length, rowPadding: d + g, style: c }).join(`
${o}`)}
${l}
`;
          }
          default: {
            const o = r ? `${e("cyan", $2)}  ` : "", l = n.split(`
`).length, d = r ? 2 : 1;
            return `${n}${o}${F2({ output: t.output, options: this.options, cursor: this.cursor, maxItems: t.maxItems, columnPadding: o.length, rowPadding: l + d, style: c }).join(`
${o}`)}
${r ? e("cyan", x2) : ""}
`;
          }
        }
      } }).prompt();
    };
    we = (t) => e("dim", t);
    be = (t, i, s) => {
      const r = { hard: true, trim: false }, u = wrapAnsi(t, i, r).split(`
`), n = u.reduce((o, l) => Math.max(dist_default2(l), o), 0), a = u.map(s).reduce((o, l) => Math.max(dist_default2(l), o), 0), c = i - (a - n);
      return wrapAnsi(t, c, r);
    };
    Se = (t = "", i = "", s) => {
      const r = s?.output ?? V2.stdout, u = s?.withGuide ?? h.withGuide, n = s?.format ?? we, a = ["", ...be(t, A(r) - 6, n).split(`
`).map(n), ""], c = dist_default2(i), o = Math.max(a.reduce((p2, f2) => {
        const h2 = dist_default2(f2);
        return h2 > p2 ? h2 : p2;
      }, 0), c) + 2, l = a.map((p2) => `${e("gray", $2)}  ${p2}${" ".repeat(o - dist_default2(p2))}${e("gray", $2)}`).join(`
`), d = u ? `${e("gray", $2)}
` : "", g = u ? Gt : dt;
      r.write(`${d}${e("green", H2)}  ${e("reset", i)} ${e("gray", st2.repeat(Math.max(o - c - 1, 1)) + ct)}
${l}
${e("gray", g + st2.repeat(o + 2) + $t)}
`);
    };
    Ce = (t) => new ot({ validate: t.validate, mask: t.mask ?? Et, signal: t.signal, input: t.input, output: t.output, render() {
      const i = t.withGuide ?? h.withGuide, s = `${i ? `${e("gray", $2)}
` : ""}${P2(this.state)}  ${t.message}
`, r = this.userInputWithCursor, u = this.masked;
      switch (this.state) {
        case "error": {
          const n = i ? `${e("yellow", $2)}  ` : "", a = i ? `${e("yellow", x2)}  ` : "", c = u ?? "";
          return t.clearOnError && this.clear(), `${s.trim()}
${n}${c}
${a}${e("yellow", this.error)}
`;
        }
        case "submit": {
          const n = i ? `${e("gray", $2)}  ` : "", a = u ? e("dim", u) : "";
          return `${s}${n}${a}`;
        }
        case "cancel": {
          const n = i ? `${e("gray", $2)}  ` : "", a = u ? e(["strikethrough", "dim"], u) : "";
          return `${s}${n}${a}${u && i ? `
${e("gray", $2)}` : ""}`;
        }
        default: {
          const n = i ? `${e("cyan", $2)}  ` : "", a = i ? e("cyan", x2) : "";
          return `${s}${n}${r}
${a}
`;
        }
      }
    } }).prompt();
    Ie = (t) => {
      const i = t.validate;
      return At({ ...t, initialUserInput: t.initialValue ?? t.root ?? process.cwd(), maxItems: 5, validate(s) {
        if (!Array.isArray(s)) {
          if (!s) return "Please select a path";
          if (i) return i(s);
        }
      }, options() {
        const s = this.userInput;
        if (s === "") return [];
        try {
          let r;
          Qt(s) ? wt(s).isDirectory() && (!t.directory || s.endsWith("/")) ? r = s : r = bt(s) : r = bt(s);
          const u = s.length > 1 && s.endsWith("/") ? s.slice(0, -1) : s;
          return Zt(r).map((n) => {
            const a = te(r, n), c = wt(a);
            return { name: n, path: a, isDirectory: c.isDirectory() };
          }).filter(({ path: n, isDirectory: a }) => n.startsWith(u) && (a || !t.directory)).map((n) => ({ value: n.path }));
        } catch {
          return [];
        }
      } });
    };
    Te = (t) => e("magenta", t);
    ft = ({ indicator: t = "dots", onCancel: i, output: s = process.stdout, cancelMessage: r, errorMessage: u, frames: n = tt2 ? ["\u25D2", "\u25D0", "\u25D3", "\u25D1"] : ["\u2022", "o", "O", "0"], delay: a = tt2 ? 80 : 120, signal: c, ...o } = {}) => {
      const l = ot2();
      let d, g, p2 = false, f2 = false, h2 = "", I2, m2 = performance.now();
      const y = A(s), v2 = o?.styleFrame ?? Te, C2 = (_) => {
        const A2 = _ > 1 ? u ?? h.messages.error : r ?? h.messages.cancel;
        f2 = _ === 1, p2 && (W2(A2, _), f2 && typeof i == "function" && i());
      }, S2 = () => C2(2), b2 = () => C2(1), G2 = () => {
        process.on("uncaughtExceptionMonitor", S2), process.on("unhandledRejection", S2), process.on("SIGINT", b2), process.on("SIGTERM", b2), process.on("exit", C2), c && c.addEventListener("abort", b2);
      }, M = () => {
        process.removeListener("uncaughtExceptionMonitor", S2), process.removeListener("unhandledRejection", S2), process.removeListener("SIGINT", b2), process.removeListener("SIGTERM", b2), process.removeListener("exit", C2), c && c.removeEventListener("abort", b2);
      }, N2 = () => {
        if (I2 === void 0) return;
        l && s.write(`
`);
        const _ = wrapAnsi(I2, y, { hard: true, trim: false }).split(`
`);
        _.length > 1 && s.write(import_sisteransi2.cursor.up(_.length - 1)), s.write(import_sisteransi2.cursor.to(0)), s.write(import_sisteransi2.erase.down());
      }, O2 = (_) => _.replace(/\.+$/, ""), j2 = (_) => {
        const A2 = (performance.now() - _) / 1e3, L2 = Math.floor(A2 / 60), D2 = Math.floor(A2 % 60);
        return L2 > 0 ? `[${L2}m ${D2}s]` : `[${D2}s]`;
      }, k2 = o.withGuide ?? h.withGuide, rt2 = (_ = "") => {
        p2 = true, d = R({ output: s }), h2 = O2(_), m2 = performance.now(), k2 && s.write(`${e("gray", $2)}
`);
        let A2 = 0, L2 = 0;
        G2(), g = setInterval(() => {
          if (l && h2 === I2) return;
          N2(), I2 = h2;
          const D2 = v2(n[A2]);
          let Z2;
          if (l) Z2 = `${D2}  ${h2}...`;
          else if (t === "timer") Z2 = `${D2}  ${h2} ${j2(m2)}`;
          else {
            const kt = ".".repeat(Math.floor(L2)).slice(0, 3);
            Z2 = `${D2}  ${h2}${kt}`;
          }
          const Bt = wrapAnsi(Z2, y, { hard: true, trim: false });
          s.write(Bt), A2 = A2 + 1 < n.length ? A2 + 1 : 0, L2 = L2 < 4 ? L2 + 0.125 : 0;
        }, a);
      }, W2 = (_ = "", A2 = 0, L2 = false) => {
        if (!p2) return;
        p2 = false, clearInterval(g), N2();
        const D2 = A2 === 0 ? e("green", H2) : A2 === 1 ? e("red", at2) : e("red", ut2);
        h2 = _ ?? h2, L2 || (t === "timer" ? s.write(`${D2}  ${h2} ${j2(m2)}
`) : s.write(`${D2}  ${h2}
`)), M(), d();
      };
      return { start: rt2, stop: (_ = "") => W2(_, 0), message: (_ = "") => {
        h2 = O2(_ ?? h2);
      }, cancel: (_ = "") => W2(_, 1), error: (_ = "") => W2(_, 2), clear: () => W2("", 0, true), get isCancelled() {
        return f2;
      } };
    };
    jt = { light: w2("\u2500", "-"), heavy: w2("\u2501", "="), block: w2("\u2588", "#") };
    it2 = (t, i) => t.includes(`
`) ? t.split(`
`).map((s) => i(s)).join(`
`) : i(t);
    xe = (t) => {
      const i = (s, r) => {
        const u = s.label ?? String(s.value);
        switch (r) {
          case "disabled":
            return `${e("gray", U2)} ${it2(u, (n) => e("gray", n))}${s.hint ? ` ${e("dim", `(${s.hint ?? "disabled"})`)}` : ""}`;
          case "selected":
            return `${it2(u, (n) => e("dim", n))}`;
          case "active":
            return `${e("green", z2)} ${u}${s.hint ? ` ${e("dim", `(${s.hint})`)}` : ""}`;
          case "cancelled":
            return `${it2(u, (n) => e(["strikethrough", "dim"], n))}`;
          default:
            return `${e("dim", U2)} ${it2(u, (n) => e("dim", n))}`;
        }
      };
      return new ut({ options: t.options, signal: t.signal, input: t.input, output: t.output, initialValue: t.initialValue, render() {
        const s = t.withGuide ?? h.withGuide, r = `${P2(this.state)}  `, u = `${yt(this.state)}  `, n = W(t.output, t.message, u, r), a = `${s ? `${e("gray", $2)}
` : ""}${n}
`;
        switch (this.state) {
          case "submit": {
            const c = s ? `${e("gray", $2)}  ` : "", o = W(t.output, i(this.options[this.cursor], "selected"), c);
            return `${a}${o}`;
          }
          case "cancel": {
            const c = s ? `${e("gray", $2)}  ` : "", o = W(t.output, i(this.options[this.cursor], "cancelled"), c);
            return `${a}${o}${s ? `
${e("gray", $2)}` : ""}`;
          }
          default: {
            const c = s ? `${e("cyan", $2)}  ` : "", o = s ? e("cyan", x2) : "", l = a.split(`
`).length, d = s ? 2 : 1;
            return `${a}${c}${F2({ output: t.output, cursor: this.cursor, options: this.options, maxItems: t.maxItems, columnPadding: c.length, rowPadding: l + d, style: (g, p2) => i(g, g.disabled ? "disabled" : p2 ? "active" : "inactive") }).join(`
${c}`)}
${o}
`;
          }
        }
      } }).prompt();
    };
    Ee = (t) => {
      const i = (s, r = "inactive") => {
        const u = s.label ?? String(s.value);
        return r === "selected" ? `${e("dim", u)}` : r === "cancelled" ? `${e(["strikethrough", "dim"], u)}` : r === "active" ? `${e(["bgCyan", "gray"], ` ${s.value} `)} ${u}${s.hint ? ` ${e("dim", `(${s.hint})`)}` : ""}` : `${e(["gray", "bgWhite", "inverse"], ` ${s.value} `)} ${u}${s.hint ? ` ${e("dim", `(${s.hint})`)}` : ""}`;
      };
      return new at({ options: t.options, signal: t.signal, input: t.input, output: t.output, initialValue: t.initialValue, caseSensitive: t.caseSensitive, render() {
        const s = t.withGuide ?? h.withGuide, r = `${s ? `${e("gray", $2)}
` : ""}${P2(this.state)}  ${t.message}
`;
        switch (this.state) {
          case "submit": {
            const u = s ? `${e("gray", $2)}  ` : "", n = this.options.find((c) => c.value === this.value) ?? t.options[0], a = W(t.output, i(n, "selected"), u);
            return `${r}${a}`;
          }
          case "cancel": {
            const u = s ? `${e("gray", $2)}  ` : "", n = W(t.output, i(this.options[0], "cancelled"), u);
            return `${r}${n}${s ? `
${e("gray", $2)}` : ""}`;
          }
          default: {
            const u = s ? `${e("cyan", $2)}  ` : "", n = s ? e("cyan", x2) : "", a = this.options.map((c, o) => W(t.output, i(c, o === this.cursor ? "active" : "inactive"), u)).join(`
`);
            return `${r}${a}
${n}
`;
          }
        }
      } }).prompt();
    };
    Nt = `${e("gray", $2)}  `;
    q2 = { message: async (t, { symbol: i = e("gray", $2) } = {}) => {
      process.stdout.write(`${e("gray", $2)}
${i}  `);
      let s = 3;
      for await (let r of t) {
        r = r.replace(/\n/g, `
${Nt}`), r.includes(`
`) && (s = 3 + nt2(r.slice(r.lastIndexOf(`
`))).length);
        const u = nt2(r).length;
        s + u < process.stdout.columns ? (s += u, process.stdout.write(r)) : (process.stdout.write(`
${Nt}${r.trimStart()}`), s = 3 + nt2(r.trimStart()).length);
      }
      process.stdout.write(`
`);
    }, info: (t) => q2.message(t, { symbol: e("blue", ht2) }), success: (t) => q2.message(t, { symbol: e("green", pt) }), step: (t) => q2.message(t, { symbol: e("green", H2) }), warn: (t) => q2.message(t, { symbol: e("yellow", mt) }), warning: (t) => q2.warn(t), error: (t) => q2.message(t, { symbol: e("red", gt) }) };
    Ge = async (t, i) => {
      for (const s of t) {
        if (s.enabled === false) continue;
        const r = ft(i);
        r.start(s.title);
        const u = await s.task(r.message);
        r.stop(u || s.title);
      }
    };
    Me = (t) => t.replace(/\x1b\[(?:\d+;)*\d*[ABCDEFGHfJKSTsu]|\x1b\[(s|u)/g, "");
    Oe = (t) => {
      const i = t.output ?? process.stdout, s = A(i), r = e("gray", $2), u = t.spacing ?? 1, n = 3, a = t.retainLog === true, c = !ot2() && It(i);
      i.write(`${r}
`), i.write(`${e("green", H2)}  ${t.title}
`);
      for (let m2 = 0; m2 < u; m2++) i.write(`${r}
`);
      const o = [{ value: "", full: "" }];
      let l = false;
      const d = (m2) => {
        if (o.length === 0) return;
        let y = 0;
        m2 && (y += u + 2);
        for (const v2 of o) {
          const { value: C2, result: S2 } = v2;
          let b2 = S2?.message ?? C2;
          if (b2.length === 0) continue;
          S2 === void 0 && v2.header !== void 0 && v2.header !== "" && (b2 += `
${v2.header}`);
          const G2 = b2.split(`
`).reduce((M, N2) => N2 === "" ? M + 1 : M + Math.ceil((N2.length + n) / s), 0);
          y += G2;
        }
        y > 0 && (y += 1, i.write(import_sisteransi2.erase.lines(y)));
      }, g = (m2, y, v2) => {
        const C2 = v2 ? `${m2.full}
${m2.value}` : m2.value;
        m2.header !== void 0 && m2.header !== "" && R2.message(m2.header.split(`
`).map((S2) => e("bold", S2)), { output: i, secondarySymbol: r, symbol: r, spacing: 0 }), R2.message(C2.split(`
`).map((S2) => e("dim", S2)), { output: i, secondarySymbol: r, symbol: r, spacing: y ?? u });
      }, p2 = () => {
        for (const m2 of o) {
          const { header: y, value: v2, full: C2 } = m2;
          (y === void 0 || y.length === 0) && v2.length === 0 || g(m2, void 0, a === true && C2.length > 0);
        }
      }, f2 = (m2, y, v2) => {
        if (d(false), (v2?.raw !== true || !l) && m2.value !== "" && (m2.value += `
`), m2.value += Me(y), l = v2?.raw === true, t.limit !== void 0) {
          const C2 = m2.value.split(`
`), S2 = C2.length - t.limit;
          if (S2 > 0) {
            const b2 = C2.splice(0, S2);
            a && (m2.full += (m2.full === "" ? "" : `
`) + b2.join(`
`));
          }
          m2.value = C2.join(`
`);
        }
        c && h2();
      }, h2 = () => {
        for (const m2 of o) m2.result ? m2.result.status === "error" ? R2.error(m2.result.message, { output: i, secondarySymbol: r, spacing: 0 }) : R2.success(m2.result.message, { output: i, secondarySymbol: r, spacing: 0 }) : m2.value !== "" && g(m2, 0);
      }, I2 = (m2, y) => {
        d(false), m2.result = y, c && h2();
      };
      return { message(m2, y) {
        f2(o[0], m2, y);
      }, group(m2) {
        const y = { header: m2, value: "", full: "" };
        return o.push(y), { message(v2, C2) {
          f2(y, v2, C2);
        }, error(v2) {
          I2(y, { status: "error", message: v2 });
        }, success(v2) {
          I2(y, { status: "success", message: v2 });
        } };
      }, error(m2, y) {
        d(true), R2.error(m2, { output: i, secondarySymbol: r, spacing: 1 }), y?.showLog !== false && p2(), o.splice(1, o.length - 1), o[0].value = "", o[0].full = "";
      }, success(m2, y) {
        d(true), R2.success(m2, { output: i, secondarySymbol: r, spacing: 1 }), y?.showLog === true && p2(), o.splice(1, o.length - 1), o[0].value = "", o[0].full = "";
      } };
    };
    Pe = (t) => new ht({ validate: t.validate, placeholder: t.placeholder, defaultValue: t.defaultValue, initialValue: t.initialValue, output: t.output, signal: t.signal, input: t.input, render() {
      const i = t?.withGuide ?? h.withGuide, s = `${`${i ? `${e("gray", $2)}
` : ""}${P2(this.state)}  `}${t.message}
`, r = t.placeholder ? e("inverse", t.placeholder[0]) + e("dim", t.placeholder.slice(1)) : e(["inverse", "hidden"], "_"), u = this.userInput ? this.userInputWithCursor : r, n = this.value ?? "";
      switch (this.state) {
        case "error": {
          const a = this.error ? `  ${e("yellow", this.error)}` : "", c = i ? `${e("yellow", $2)}  ` : "", o = i ? e("yellow", x2) : "";
          return `${s.trim()}
${c}${u}
${o}${a}
`;
        }
        case "submit": {
          const a = n ? `  ${e("dim", n)}` : "", c = i ? e("gray", $2) : "";
          return `${s}${c}${a}`;
        }
        case "cancel": {
          const a = n ? `  ${e(["strikethrough", "dim"], n)}` : "", c = i ? e("gray", $2) : "";
          return `${s}${c}${a}${n.trim() ? `
${c}` : ""}`;
        }
        default: {
          const a = i ? `${e("cyan", $2)}  ` : "", c = i ? e("cyan", x2) : "";
          return `${s}${a}${u}
${c}
`;
        }
      }
    } }).prompt();
  }
});

// node_modules/events-universal/default.js
var require_default = __commonJS({
  "node_modules/events-universal/default.js"(exports, module) {
    module.exports = __require("events");
  }
});

// node_modules/fast-fifo/fixed-size.js
var require_fixed_size = __commonJS({
  "node_modules/fast-fifo/fixed-size.js"(exports, module) {
    module.exports = class FixedFIFO {
      constructor(hwm) {
        if (!(hwm > 0) || (hwm - 1 & hwm) !== 0) throw new Error("Max size for a FixedFIFO should be a power of two");
        this.buffer = new Array(hwm);
        this.mask = hwm - 1;
        this.top = 0;
        this.btm = 0;
        this.next = null;
      }
      clear() {
        this.top = this.btm = 0;
        this.next = null;
        this.buffer.fill(void 0);
      }
      push(data) {
        if (this.buffer[this.top] !== void 0) return false;
        this.buffer[this.top] = data;
        this.top = this.top + 1 & this.mask;
        return true;
      }
      shift() {
        const last = this.buffer[this.btm];
        if (last === void 0) return void 0;
        this.buffer[this.btm] = void 0;
        this.btm = this.btm + 1 & this.mask;
        return last;
      }
      peek() {
        return this.buffer[this.btm];
      }
      isEmpty() {
        return this.buffer[this.btm] === void 0;
      }
    };
  }
});

// node_modules/fast-fifo/index.js
var require_fast_fifo = __commonJS({
  "node_modules/fast-fifo/index.js"(exports, module) {
    var FixedFIFO = require_fixed_size();
    module.exports = class FastFIFO {
      constructor(hwm) {
        this.hwm = hwm || 16;
        this.head = new FixedFIFO(this.hwm);
        this.tail = this.head;
        this.length = 0;
      }
      clear() {
        this.head = this.tail;
        this.head.clear();
        this.length = 0;
      }
      push(val) {
        this.length++;
        if (!this.head.push(val)) {
          const prev = this.head;
          this.head = prev.next = new FixedFIFO(2 * this.head.buffer.length);
          this.head.push(val);
        }
      }
      shift() {
        if (this.length !== 0) this.length--;
        const val = this.tail.shift();
        if (val === void 0 && this.tail.next) {
          const next = this.tail.next;
          this.tail.next = null;
          this.tail = next;
          return this.tail.shift();
        }
        return val;
      }
      peek() {
        const val = this.tail.peek();
        if (val === void 0 && this.tail.next) return this.tail.next.peek();
        return val;
      }
      isEmpty() {
        return this.length === 0;
      }
    };
  }
});

// node_modules/b4a/index.js
var require_b4a = __commonJS({
  "node_modules/b4a/index.js"(exports, module) {
    function isBuffer(value) {
      return Buffer.isBuffer(value) || value instanceof Uint8Array;
    }
    function isEncoding(encoding) {
      return Buffer.isEncoding(encoding);
    }
    function alloc(size, fill2, encoding) {
      return Buffer.alloc(size, fill2, encoding);
    }
    function allocUnsafe(size) {
      return Buffer.allocUnsafe(size);
    }
    function allocUnsafeSlow(size) {
      return Buffer.allocUnsafeSlow(size);
    }
    function byteLength(string, encoding) {
      return Buffer.byteLength(string, encoding);
    }
    function compare(a, b2) {
      return Buffer.compare(a, b2);
    }
    function concat(buffers, totalLength) {
      return Buffer.concat(buffers, totalLength);
    }
    function copy(source, target, targetStart, start, end) {
      return toBuffer(source).copy(target, targetStart, start, end);
    }
    function equals(a, b2) {
      return toBuffer(a).equals(b2);
    }
    function fill(buffer, value, offset, end, encoding) {
      return toBuffer(buffer).fill(value, offset, end, encoding);
    }
    function from(value, encodingOrOffset, length) {
      return Buffer.from(value, encodingOrOffset, length);
    }
    function includes(buffer, value, byteOffset, encoding) {
      return toBuffer(buffer).includes(value, byteOffset, encoding);
    }
    function indexOf(buffer, value, byfeOffset, encoding) {
      return toBuffer(buffer).indexOf(value, byfeOffset, encoding);
    }
    function lastIndexOf(buffer, value, byteOffset, encoding) {
      return toBuffer(buffer).lastIndexOf(value, byteOffset, encoding);
    }
    function swap16(buffer) {
      return toBuffer(buffer).swap16();
    }
    function swap32(buffer) {
      return toBuffer(buffer).swap32();
    }
    function swap64(buffer) {
      return toBuffer(buffer).swap64();
    }
    function toBuffer(buffer) {
      if (Buffer.isBuffer(buffer)) return buffer;
      return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }
    function toString(buffer, encoding, start, end) {
      return toBuffer(buffer).toString(encoding, start, end);
    }
    function write(buffer, string, offset, length, encoding) {
      return toBuffer(buffer).write(string, offset, length, encoding);
    }
    function readDoubleBE(buffer, offset) {
      return toBuffer(buffer).readDoubleBE(offset);
    }
    function readDoubleLE(buffer, offset) {
      return toBuffer(buffer).readDoubleLE(offset);
    }
    function readFloatBE(buffer, offset) {
      return toBuffer(buffer).readFloatBE(offset);
    }
    function readFloatLE(buffer, offset) {
      return toBuffer(buffer).readFloatLE(offset);
    }
    function readInt32BE(buffer, offset) {
      return toBuffer(buffer).readInt32BE(offset);
    }
    function readInt32LE(buffer, offset) {
      return toBuffer(buffer).readInt32LE(offset);
    }
    function readUInt32BE(buffer, offset) {
      return toBuffer(buffer).readUInt32BE(offset);
    }
    function readUInt32LE(buffer, offset) {
      return toBuffer(buffer).readUInt32LE(offset);
    }
    function writeDoubleBE(buffer, value, offset) {
      return toBuffer(buffer).writeDoubleBE(value, offset);
    }
    function writeDoubleLE(buffer, value, offset) {
      return toBuffer(buffer).writeDoubleLE(value, offset);
    }
    function writeFloatBE(buffer, value, offset) {
      return toBuffer(buffer).writeFloatBE(value, offset);
    }
    function writeFloatLE(buffer, value, offset) {
      return toBuffer(buffer).writeFloatLE(value, offset);
    }
    function writeInt32BE(buffer, value, offset) {
      return toBuffer(buffer).writeInt32BE(value, offset);
    }
    function writeInt32LE(buffer, value, offset) {
      return toBuffer(buffer).writeInt32LE(value, offset);
    }
    function writeUInt32BE(buffer, value, offset) {
      return toBuffer(buffer).writeUInt32BE(value, offset);
    }
    function writeUInt32LE(buffer, value, offset) {
      return toBuffer(buffer).writeUInt32LE(value, offset);
    }
    module.exports = {
      isBuffer,
      isEncoding,
      alloc,
      allocUnsafe,
      allocUnsafeSlow,
      byteLength,
      compare,
      concat,
      copy,
      equals,
      fill,
      from,
      includes,
      indexOf,
      lastIndexOf,
      swap16,
      swap32,
      swap64,
      toBuffer,
      toString,
      write,
      readDoubleBE,
      readDoubleLE,
      readFloatBE,
      readFloatLE,
      readInt32BE,
      readInt32LE,
      readUInt32BE,
      readUInt32LE,
      writeDoubleBE,
      writeDoubleLE,
      writeFloatBE,
      writeFloatLE,
      writeInt32BE,
      writeInt32LE,
      writeUInt32BE,
      writeUInt32LE
    };
  }
});

// node_modules/text-decoder/lib/pass-through-decoder.js
var require_pass_through_decoder = __commonJS({
  "node_modules/text-decoder/lib/pass-through-decoder.js"(exports, module) {
    var b4a = require_b4a();
    module.exports = class PassThroughDecoder {
      constructor(encoding) {
        this.encoding = encoding;
      }
      get remaining() {
        return 0;
      }
      decode(data) {
        return b4a.toString(data, this.encoding);
      }
      flush() {
        return "";
      }
    };
  }
});

// node_modules/text-decoder/lib/utf8-decoder.js
var require_utf8_decoder = __commonJS({
  "node_modules/text-decoder/lib/utf8-decoder.js"(exports, module) {
    var b4a = require_b4a();
    module.exports = class UTF8Decoder {
      constructor() {
        this._reset();
      }
      get remaining() {
        return this.bytesSeen;
      }
      decode(data) {
        if (data.byteLength === 0) return "";
        if (this.bytesNeeded === 0 && trailingIncomplete(data, 0) === 0) {
          this.bytesSeen = trailingBytesSeen(data);
          return b4a.toString(data, "utf8");
        }
        let result = "";
        let start = 0;
        if (this.bytesNeeded > 0) {
          while (start < data.byteLength) {
            const byte = data[start];
            if (byte < this.lowerBoundary || byte > this.upperBoundary) {
              result += "\uFFFD";
              this._reset();
              break;
            }
            this.lowerBoundary = 128;
            this.upperBoundary = 191;
            this.codePoint = this.codePoint << 6 | byte & 63;
            this.bytesSeen++;
            start++;
            if (this.bytesSeen === this.bytesNeeded) {
              result += String.fromCodePoint(this.codePoint);
              this._reset();
              break;
            }
          }
          if (this.bytesNeeded > 0) return result;
        }
        const trailing = trailingIncomplete(data, start);
        const end = data.byteLength - trailing;
        if (end > start) result += b4a.toString(data, "utf8", start, end);
        for (let i = end; i < data.byteLength; i++) {
          const byte = data[i];
          if (this.bytesNeeded === 0) {
            if (byte <= 127) {
              this.bytesSeen = 0;
              result += String.fromCharCode(byte);
            } else if (byte >= 194 && byte <= 223) {
              this.bytesNeeded = 2;
              this.bytesSeen = 1;
              this.codePoint = byte & 31;
            } else if (byte >= 224 && byte <= 239) {
              if (byte === 224) this.lowerBoundary = 160;
              else if (byte === 237) this.upperBoundary = 159;
              this.bytesNeeded = 3;
              this.bytesSeen = 1;
              this.codePoint = byte & 15;
            } else if (byte >= 240 && byte <= 244) {
              if (byte === 240) this.lowerBoundary = 144;
              else if (byte === 244) this.upperBoundary = 143;
              this.bytesNeeded = 4;
              this.bytesSeen = 1;
              this.codePoint = byte & 7;
            } else {
              this.bytesSeen = 1;
              result += "\uFFFD";
            }
            continue;
          }
          if (byte < this.lowerBoundary || byte > this.upperBoundary) {
            result += "\uFFFD";
            i--;
            this._reset();
            continue;
          }
          this.lowerBoundary = 128;
          this.upperBoundary = 191;
          this.codePoint = this.codePoint << 6 | byte & 63;
          this.bytesSeen++;
          if (this.bytesSeen === this.bytesNeeded) {
            result += String.fromCodePoint(this.codePoint);
            this._reset();
          }
        }
        return result;
      }
      flush() {
        const result = this.bytesNeeded > 0 ? "\uFFFD" : "";
        this._reset();
        return result;
      }
      _reset() {
        this.codePoint = 0;
        this.bytesNeeded = 0;
        this.bytesSeen = 0;
        this.lowerBoundary = 128;
        this.upperBoundary = 191;
      }
    };
    function trailingIncomplete(data, start) {
      const len = data.byteLength;
      if (len <= start) return 0;
      const limit = Math.max(start, len - 4);
      let i = len - 1;
      while (i > limit && (data[i] & 192) === 128) i--;
      if (i < start) return 0;
      const byte = data[i];
      let needed;
      if (byte <= 127) return 0;
      if (byte >= 194 && byte <= 223) needed = 2;
      else if (byte >= 224 && byte <= 239) needed = 3;
      else if (byte >= 240 && byte <= 244) needed = 4;
      else return 0;
      const available = len - i;
      return available < needed ? available : 0;
    }
    function trailingBytesSeen(data) {
      const len = data.byteLength;
      if (len === 0) return 0;
      const last = data[len - 1];
      if (last <= 127) return 0;
      if ((last & 192) !== 128) return 1;
      const limit = Math.max(0, len - 4);
      let i = len - 2;
      while (i >= limit && (data[i] & 192) === 128) i--;
      if (i < 0) return 1;
      const first = data[i];
      let needed;
      if (first >= 194 && first <= 223) needed = 2;
      else if (first >= 224 && first <= 239) needed = 3;
      else if (first >= 240 && first <= 244) needed = 4;
      else return 1;
      if (len - i !== needed) return 1;
      if (needed >= 3) {
        const second = data[i + 1];
        if (first === 224 && second < 160) return 1;
        if (first === 237 && second > 159) return 1;
        if (first === 240 && second < 144) return 1;
        if (first === 244 && second > 143) return 1;
      }
      return 0;
    }
  }
});

// node_modules/text-decoder/index.js
var require_text_decoder = __commonJS({
  "node_modules/text-decoder/index.js"(exports, module) {
    var PassThroughDecoder = require_pass_through_decoder();
    var UTF8Decoder = require_utf8_decoder();
    module.exports = class TextDecoder {
      constructor(encoding = "utf8") {
        this.encoding = normalizeEncoding(encoding);
        switch (this.encoding) {
          case "utf8":
            this.decoder = new UTF8Decoder();
            break;
          case "utf16le":
          case "base64":
            throw new Error("Unsupported encoding: " + this.encoding);
          default:
            this.decoder = new PassThroughDecoder(this.encoding);
        }
      }
      get remaining() {
        return this.decoder.remaining;
      }
      push(data) {
        if (typeof data === "string") return data;
        return this.decoder.decode(data);
      }
      // For Node.js compatibility
      write(data) {
        return this.push(data);
      }
      end(data) {
        let result = "";
        if (data) result = this.push(data);
        result += this.decoder.flush();
        return result;
      }
    };
    function normalizeEncoding(encoding) {
      encoding = encoding.toLowerCase();
      switch (encoding) {
        case "utf8":
        case "utf-8":
          return "utf8";
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return "utf16le";
        case "latin1":
        case "binary":
          return "latin1";
        case "base64":
        case "ascii":
        case "hex":
          return encoding;
        default:
          throw new Error("Unknown encoding: " + encoding);
      }
    }
  }
});

// node_modules/streamx/lib/errors.js
var require_errors = __commonJS({
  "node_modules/streamx/lib/errors.js"(exports, module) {
    module.exports = class StreamError extends Error {
      constructor(msg, code, fn = StreamError) {
        super(msg);
        this.code = code;
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, fn);
        }
      }
      static isStreamDestroyed(err) {
        return err && err.code === "STREAM_DESTROYED";
      }
      static isPrematureClose(err) {
        return err && err.code === "PREMATURE_CLOSE";
      }
      static isAborted(err) {
        return err && err.code === "ABORTED";
      }
      static isBadArgument(err) {
        return err && err.code === "BAD_ARGUMENT";
      }
      get name() {
        return "StreamError";
      }
      static STREAM_DESTROYED() {
        return new StreamError("Stream was destroyed", "STREAM_DESTROYED", StreamError.STREAM_DESTROYED);
      }
      static PREMATURE_CLOSE(msg = "Premature close") {
        return new StreamError(msg, "PREMATURE_CLOSE", StreamError.PREMATURE_CLOSE);
      }
      static ABORTED() {
        return new StreamError("Stream aborted", "ABORTED", StreamError.ABORTED);
      }
      static BAD_ARGUMENT(msg = "Bad argument") {
        return new StreamError(msg, "BAD_ARGUMENT", StreamError.BAD_ARGUMENT);
      }
    };
  }
});

// node_modules/streamx/index.js
var require_streamx = __commonJS({
  "node_modules/streamx/index.js"(exports, module) {
    var { EventEmitter } = require_default();
    var FIFO = require_fast_fifo();
    var TextDecoder2 = require_text_decoder();
    var StreamError = require_errors();
    var qmt = typeof queueMicrotask === "undefined" ? (fn) => global.process.nextTick(fn) : queueMicrotask;
    var MAX = (1 << 29) - 1;
    var OPENING = 1;
    var PREDESTROYING = 2;
    var DESTROYING = 4;
    var DESTROYED = 8;
    var NOT_OPENING = MAX ^ OPENING;
    var NOT_PREDESTROYING = MAX ^ PREDESTROYING;
    var READ_ACTIVE = 1 << 4;
    var READ_UPDATING = 2 << 4;
    var READ_PRIMARY = 4 << 4;
    var READ_QUEUED = 8 << 4;
    var READ_RESUMED = 16 << 4;
    var READ_PIPE_DRAINED = 32 << 4;
    var READ_ENDING = 64 << 4;
    var READ_EMIT_DATA = 128 << 4;
    var READ_EMIT_READABLE = 256 << 4;
    var READ_EMITTED_READABLE = 512 << 4;
    var READ_DONE = 1024 << 4;
    var READ_NEXT_TICK = 2048 << 4;
    var READ_NEEDS_PUSH = 4096 << 4;
    var READ_READ_AHEAD = 8192 << 4;
    var READ_FLOWING = READ_RESUMED | READ_PIPE_DRAINED;
    var READ_ACTIVE_AND_NEEDS_PUSH = READ_ACTIVE | READ_NEEDS_PUSH;
    var READ_PRIMARY_AND_ACTIVE = READ_PRIMARY | READ_ACTIVE;
    var READ_EMIT_READABLE_AND_QUEUED = READ_EMIT_READABLE | READ_QUEUED;
    var READ_RESUMED_READ_AHEAD = READ_RESUMED | READ_READ_AHEAD;
    var READ_NOT_ACTIVE = MAX ^ READ_ACTIVE;
    var READ_NON_PRIMARY = MAX ^ READ_PRIMARY;
    var READ_NON_PRIMARY_AND_PUSHED = MAX ^ (READ_PRIMARY | READ_NEEDS_PUSH);
    var READ_PUSHED = MAX ^ READ_NEEDS_PUSH;
    var READ_PAUSED = MAX ^ READ_RESUMED;
    var READ_NOT_QUEUED = MAX ^ (READ_QUEUED | READ_EMITTED_READABLE);
    var READ_NOT_ENDING = MAX ^ READ_ENDING;
    var READ_PIPE_NOT_DRAINED = MAX ^ READ_FLOWING;
    var READ_NOT_NEXT_TICK = MAX ^ READ_NEXT_TICK;
    var READ_NOT_UPDATING = MAX ^ READ_UPDATING;
    var READ_NO_READ_AHEAD = MAX ^ READ_READ_AHEAD;
    var READ_PAUSED_NO_READ_AHEAD = MAX ^ READ_RESUMED_READ_AHEAD;
    var WRITE_ACTIVE = 1 << 18;
    var WRITE_UPDATING = 2 << 18;
    var WRITE_PRIMARY = 4 << 18;
    var WRITE_QUEUED = 8 << 18;
    var WRITE_UNDRAINED = 16 << 18;
    var WRITE_DONE = 32 << 18;
    var WRITE_EMIT_DRAIN = 64 << 18;
    var WRITE_NEXT_TICK = 128 << 18;
    var WRITE_WRITING = 256 << 18;
    var WRITE_FINISHING = 512 << 18;
    var WRITE_CORKED = 1024 << 18;
    var WRITE_NOT_ACTIVE = MAX ^ (WRITE_ACTIVE | WRITE_WRITING);
    var WRITE_NON_PRIMARY = MAX ^ WRITE_PRIMARY;
    var WRITE_NOT_FINISHING = MAX ^ (WRITE_ACTIVE | WRITE_FINISHING);
    var WRITE_DRAINED = MAX ^ WRITE_UNDRAINED;
    var WRITE_NOT_QUEUED = MAX ^ WRITE_QUEUED;
    var WRITE_NOT_NEXT_TICK = MAX ^ WRITE_NEXT_TICK;
    var WRITE_NOT_UPDATING = MAX ^ WRITE_UPDATING;
    var WRITE_NOT_CORKED = MAX ^ WRITE_CORKED;
    var ACTIVE = READ_ACTIVE | WRITE_ACTIVE;
    var NOT_ACTIVE = MAX ^ ACTIVE;
    var DONE = READ_DONE | WRITE_DONE;
    var DESTROY_STATUS = DESTROYING | DESTROYED | PREDESTROYING;
    var OPEN_STATUS = DESTROY_STATUS | OPENING;
    var AUTO_DESTROY = DESTROY_STATUS | DONE;
    var NON_PRIMARY = WRITE_NON_PRIMARY & READ_NON_PRIMARY;
    var ACTIVE_OR_TICKING = WRITE_NEXT_TICK | READ_NEXT_TICK;
    var TICKING = ACTIVE_OR_TICKING & NOT_ACTIVE;
    var IS_OPENING = OPEN_STATUS | TICKING;
    var READ_PRIMARY_STATUS = OPEN_STATUS | READ_ENDING | READ_DONE;
    var READ_STATUS = OPEN_STATUS | READ_DONE | READ_QUEUED;
    var READ_ENDING_STATUS = OPEN_STATUS | READ_ENDING | READ_QUEUED;
    var READ_READABLE_STATUS = OPEN_STATUS | READ_EMIT_READABLE | READ_QUEUED | READ_EMITTED_READABLE;
    var SHOULD_NOT_READ = OPEN_STATUS | READ_ACTIVE | READ_ENDING | READ_DONE | READ_NEEDS_PUSH | READ_READ_AHEAD;
    var READ_BACKPRESSURE_STATUS = DESTROY_STATUS | READ_ENDING | READ_DONE;
    var READ_UPDATE_SYNC_STATUS = READ_UPDATING | OPEN_STATUS | READ_NEXT_TICK | READ_PRIMARY;
    var READ_NEXT_TICK_OR_OPENING = READ_NEXT_TICK | OPENING;
    var WRITE_PRIMARY_STATUS = OPEN_STATUS | WRITE_FINISHING | WRITE_DONE;
    var WRITE_QUEUED_AND_UNDRAINED = WRITE_QUEUED | WRITE_UNDRAINED;
    var WRITE_QUEUED_AND_ACTIVE = WRITE_QUEUED | WRITE_ACTIVE;
    var WRITE_DRAIN_STATUS = WRITE_QUEUED | WRITE_UNDRAINED | OPEN_STATUS | WRITE_ACTIVE;
    var WRITE_STATUS = OPEN_STATUS | WRITE_ACTIVE | WRITE_QUEUED | WRITE_CORKED;
    var WRITE_PRIMARY_AND_ACTIVE = WRITE_PRIMARY | WRITE_ACTIVE;
    var WRITE_ACTIVE_AND_WRITING = WRITE_ACTIVE | WRITE_WRITING;
    var WRITE_FINISHING_STATUS = OPEN_STATUS | WRITE_FINISHING | WRITE_QUEUED_AND_ACTIVE | WRITE_DONE;
    var WRITE_BACKPRESSURE_STATUS = WRITE_UNDRAINED | DESTROY_STATUS | WRITE_FINISHING | WRITE_DONE;
    var WRITE_UPDATE_SYNC_STATUS = WRITE_UPDATING | OPEN_STATUS | WRITE_NEXT_TICK | WRITE_PRIMARY;
    var WRITE_DROP_DATA = WRITE_FINISHING | WRITE_DONE | DESTROY_STATUS;
    var asyncIterator = Symbol.asyncIterator || Symbol("asyncIterator");
    var WritableState = class {
      constructor(stream, { highWaterMark = 16384, map = null, mapWritable, byteLength, byteLengthWritable } = {}) {
        this.stream = stream;
        this.queue = new FIFO();
        this.highWaterMark = highWaterMark;
        this.buffered = 0;
        this.error = null;
        this.pipeline = null;
        this.drains = null;
        this.byteLength = byteLengthWritable || byteLength || defaultByteLength;
        this.map = mapWritable || map;
        this.afterWrite = afterWrite.bind(this);
        this.afterUpdateNextTick = updateWriteNT.bind(this);
      }
      get ending() {
        return (this.stream._duplexState & WRITE_FINISHING) !== 0;
      }
      get ended() {
        return (this.stream._duplexState & WRITE_DONE) !== 0;
      }
      push(data) {
        if ((this.stream._duplexState & WRITE_DROP_DATA) !== 0) return false;
        if (this.map !== null) data = this.map(data);
        this.buffered += this.byteLength(data);
        this.queue.push(data);
        if (this.buffered < this.highWaterMark) {
          this.stream._duplexState |= WRITE_QUEUED;
          return true;
        }
        this.stream._duplexState |= WRITE_QUEUED_AND_UNDRAINED;
        return false;
      }
      shift() {
        const data = this.queue.shift();
        this.buffered -= this.byteLength(data);
        if (this.buffered === 0) this.stream._duplexState &= WRITE_NOT_QUEUED;
        return data;
      }
      end(data) {
        if (typeof data === "function") {
          this.stream.once("finish", data);
        } else if (data !== void 0 && data !== null) {
          this.push(data);
        }
        this.stream._duplexState = (this.stream._duplexState | WRITE_FINISHING) & WRITE_NON_PRIMARY;
      }
      autoBatch(data, cb) {
        const buffer = [];
        const stream = this.stream;
        buffer.push(data);
        while ((stream._duplexState & WRITE_STATUS) === WRITE_QUEUED_AND_ACTIVE) {
          buffer.push(stream._writableState.shift());
        }
        if ((stream._duplexState & OPEN_STATUS) !== 0) return cb(null);
        stream._writev(buffer, cb);
      }
      update() {
        const stream = this.stream;
        stream._duplexState |= WRITE_UPDATING;
        do {
          while ((stream._duplexState & WRITE_STATUS) === WRITE_QUEUED) {
            const data = this.shift();
            stream._duplexState |= WRITE_ACTIVE_AND_WRITING;
            stream._write(data, this.afterWrite);
          }
          if ((stream._duplexState & WRITE_PRIMARY_AND_ACTIVE) === 0) this.updateNonPrimary();
        } while (this.continueUpdate() === true);
        stream._duplexState &= WRITE_NOT_UPDATING;
      }
      updateNonPrimary() {
        const stream = this.stream;
        if ((stream._duplexState & WRITE_FINISHING_STATUS) === WRITE_FINISHING) {
          stream._duplexState = stream._duplexState | WRITE_ACTIVE;
          stream._final(afterFinal.bind(this));
          return;
        }
        if ((stream._duplexState & DESTROY_STATUS) === DESTROYING) {
          if ((stream._duplexState & ACTIVE_OR_TICKING) === 0) {
            stream._duplexState |= ACTIVE;
            stream._destroy(afterDestroy.bind(this));
          }
          return;
        }
        if ((stream._duplexState & IS_OPENING) === OPENING) {
          stream._duplexState = (stream._duplexState | ACTIVE) & NOT_OPENING;
          stream._open(afterOpen.bind(this));
        }
      }
      continueUpdate() {
        if ((this.stream._duplexState & WRITE_NEXT_TICK) === 0) return false;
        this.stream._duplexState &= WRITE_NOT_NEXT_TICK;
        return true;
      }
      updateCallback() {
        if ((this.stream._duplexState & WRITE_UPDATE_SYNC_STATUS) === WRITE_PRIMARY) {
          this.update();
        } else {
          this.updateNextTick();
        }
      }
      updateNextTick() {
        if ((this.stream._duplexState & WRITE_NEXT_TICK) !== 0) return;
        this.stream._duplexState |= WRITE_NEXT_TICK;
        if ((this.stream._duplexState & WRITE_UPDATING) === 0) qmt(this.afterUpdateNextTick);
      }
    };
    var ReadableState = class {
      constructor(stream, { highWaterMark = 16384, map = null, mapReadable, byteLength, byteLengthReadable } = {}) {
        this.stream = stream;
        this.queue = new FIFO();
        this.highWaterMark = highWaterMark === 0 ? 1 : highWaterMark;
        this.buffered = 0;
        this.readAhead = highWaterMark > 0;
        this.error = null;
        this.pipeline = null;
        this.byteLength = byteLengthReadable || byteLength || defaultByteLength;
        this.map = mapReadable || map;
        this.pipeTo = null;
        this.afterRead = afterRead.bind(this);
        this.afterUpdateNextTick = updateReadNT.bind(this);
      }
      get ending() {
        return (this.stream._duplexState & READ_ENDING) !== 0;
      }
      get ended() {
        return (this.stream._duplexState & READ_DONE) !== 0;
      }
      pipe(pipeTo, cb) {
        if (this.pipeTo !== null) throw StreamError.BAD_ARGUMENT("Can only pipe to one destination");
        if (typeof cb !== "function") cb = null;
        this.stream._duplexState |= READ_PIPE_DRAINED;
        this.pipeTo = pipeTo;
        this.pipeline = new Pipeline(this.stream, pipeTo, cb);
        if (cb) this.stream.on("error", noop);
        if (isStreamx(pipeTo)) {
          pipeTo._writableState.pipeline = this.pipeline;
          if (cb) pipeTo.on("error", noop);
          pipeTo.on("finish", this.pipeline.finished.bind(this.pipeline));
        } else {
          const onerror = this.pipeline.done.bind(this.pipeline, pipeTo);
          const onclose = this.pipeline.done.bind(this.pipeline, pipeTo, null);
          pipeTo.on("error", onerror);
          pipeTo.on("close", onclose);
          pipeTo.on("finish", this.pipeline.finished.bind(this.pipeline));
        }
        pipeTo.on("drain", afterDrain.bind(this));
        this.stream.emit("piping", pipeTo);
        pipeTo.emit("pipe", this.stream);
      }
      push(data) {
        const stream = this.stream;
        if (data === null) {
          this.highWaterMark = 0;
          stream._duplexState = (stream._duplexState | READ_ENDING) & READ_NON_PRIMARY_AND_PUSHED;
          return false;
        }
        if (this.map !== null) {
          data = this.map(data);
          if (data === null) {
            stream._duplexState &= READ_PUSHED;
            return this.buffered < this.highWaterMark;
          }
        }
        this.buffered += this.byteLength(data);
        this.queue.push(data);
        stream._duplexState = (stream._duplexState | READ_QUEUED) & READ_PUSHED;
        return this.buffered < this.highWaterMark;
      }
      shift() {
        const data = this.queue.shift();
        this.buffered -= this.byteLength(data);
        if (this.buffered === 0) {
          this.stream._duplexState &= READ_NOT_QUEUED;
        }
        return data;
      }
      unshift(data) {
        const pending = [this.map !== null ? this.map(data) : data];
        while (this.buffered > 0) pending.push(this.shift());
        for (let i = 0; i < pending.length - 1; i++) {
          const data2 = pending[i];
          this.buffered += this.byteLength(data2);
          this.queue.push(data2);
        }
        this.push(pending[pending.length - 1]);
      }
      read() {
        const stream = this.stream;
        if ((stream._duplexState & READ_STATUS) === READ_QUEUED) {
          const data = this.shift();
          if (this.pipeTo !== null && this.pipeTo.write(data) === false) {
            stream._duplexState &= READ_PIPE_NOT_DRAINED;
          }
          if ((stream._duplexState & READ_EMIT_DATA) !== 0) {
            stream.emit("data", data);
          }
          return data;
        }
        if (this.readAhead === false) {
          stream._duplexState |= READ_READ_AHEAD;
          this.updateNextTick();
        }
        return null;
      }
      drain() {
        const stream = this.stream;
        while ((stream._duplexState & READ_STATUS) === READ_QUEUED && (stream._duplexState & READ_FLOWING) !== 0) {
          const data = this.shift();
          if (this.pipeTo !== null && this.pipeTo.write(data) === false) {
            stream._duplexState &= READ_PIPE_NOT_DRAINED;
          }
          if ((stream._duplexState & READ_EMIT_DATA) !== 0) {
            stream.emit("data", data);
          }
        }
      }
      update() {
        const stream = this.stream;
        stream._duplexState |= READ_UPDATING;
        do {
          this.drain();
          while (this.buffered < this.highWaterMark && (stream._duplexState & SHOULD_NOT_READ) === READ_READ_AHEAD) {
            stream._duplexState |= READ_ACTIVE_AND_NEEDS_PUSH;
            stream._read(this.afterRead);
            this.drain();
          }
          if ((stream._duplexState & READ_READABLE_STATUS) === READ_EMIT_READABLE_AND_QUEUED) {
            stream._duplexState |= READ_EMITTED_READABLE;
            stream.emit("readable");
          }
          if ((stream._duplexState & READ_PRIMARY_AND_ACTIVE) === 0) {
            this.updateNonPrimary();
          }
        } while (this.continueUpdate() === true);
        stream._duplexState &= READ_NOT_UPDATING;
      }
      updateNonPrimary() {
        const stream = this.stream;
        if ((stream._duplexState & READ_ENDING_STATUS) === READ_ENDING) {
          stream._duplexState = (stream._duplexState | READ_DONE) & READ_NOT_ENDING;
          stream.emit("end");
          if ((stream._duplexState & AUTO_DESTROY) === DONE) {
            stream._duplexState |= DESTROYING;
          }
          if (this.pipeTo !== null) {
            this.pipeTo.end();
          }
        }
        if ((stream._duplexState & DESTROY_STATUS) === DESTROYING) {
          if ((stream._duplexState & ACTIVE_OR_TICKING) === 0) {
            stream._duplexState |= ACTIVE;
            stream._destroy(afterDestroy.bind(this));
          }
          return;
        }
        if ((stream._duplexState & IS_OPENING) === OPENING) {
          stream._duplexState = (stream._duplexState | ACTIVE) & NOT_OPENING;
          stream._open(afterOpen.bind(this));
        }
      }
      continueUpdate() {
        if ((this.stream._duplexState & READ_NEXT_TICK) === 0) return false;
        this.stream._duplexState &= READ_NOT_NEXT_TICK;
        return true;
      }
      updateCallback() {
        if ((this.stream._duplexState & READ_UPDATE_SYNC_STATUS) === READ_PRIMARY) {
          this.update();
        } else {
          this.updateNextTick();
        }
      }
      updateNextTickIfOpen() {
        if ((this.stream._duplexState & READ_NEXT_TICK_OR_OPENING) !== 0) return;
        this.stream._duplexState |= READ_NEXT_TICK;
        if ((this.stream._duplexState & READ_UPDATING) === 0) qmt(this.afterUpdateNextTick);
      }
      updateNextTick() {
        if ((this.stream._duplexState & READ_NEXT_TICK) !== 0) return;
        this.stream._duplexState |= READ_NEXT_TICK;
        if ((this.stream._duplexState & READ_UPDATING) === 0) qmt(this.afterUpdateNextTick);
      }
    };
    var TransformState = class {
      constructor(stream) {
        this.data = null;
        this.afterTransform = afterTransform.bind(stream);
        this.afterFinal = null;
      }
    };
    var Pipeline = class {
      constructor(src, dst, cb) {
        this.from = src;
        this.to = dst;
        this.afterPipe = cb;
        this.error = null;
        this.pipeToFinished = false;
      }
      finished() {
        this.pipeToFinished = true;
      }
      done(stream, err) {
        if (err) this.error = err;
        if (stream === this.to) {
          this.to = null;
          if (this.from !== null) {
            if ((this.from._duplexState & READ_DONE) === 0 || !this.pipeToFinished) {
              this.from.destroy(this.error || StreamError.PREMATURE_CLOSE("Writable stream closed"));
            }
            return;
          }
        }
        if (stream === this.from) {
          this.from = null;
          if (this.to !== null) {
            if ((stream._duplexState & READ_DONE) === 0) {
              this.to.destroy(this.error || StreamError.PREMATURE_CLOSE("Readable stream closed"));
            }
            return;
          }
        }
        if (this.afterPipe !== null) this.afterPipe(this.error);
        this.to = this.from = this.afterPipe = null;
      }
    };
    function afterDrain() {
      this.stream._duplexState |= READ_PIPE_DRAINED;
      this.updateCallback();
    }
    function afterFinal(err) {
      const stream = this.stream;
      if (err) stream.destroy(err);
      if ((stream._duplexState & DESTROY_STATUS) === 0) {
        stream._duplexState |= WRITE_DONE;
        stream.emit("finish");
      }
      if ((stream._duplexState & AUTO_DESTROY) === DONE) {
        stream._duplexState |= DESTROYING;
      }
      stream._duplexState &= WRITE_NOT_FINISHING;
      if ((stream._duplexState & WRITE_UPDATING) === 0) {
        this.update();
      } else {
        this.updateNextTick();
      }
    }
    function afterDestroy(err) {
      const stream = this.stream;
      if (!err && !StreamError.isStreamDestroyed(this.error)) err = this.error;
      if (err) stream.emit("error", err);
      stream._duplexState |= DESTROYED;
      stream.emit("close");
      const rs = stream._readableState;
      const ws = stream._writableState;
      if (rs !== null && rs.pipeline !== null) {
        rs.pipeline.done(stream, err);
      }
      if (ws !== null) {
        while (ws.drains !== null && ws.drains.length > 0) {
          ws.drains.shift().resolve(false);
        }
        if (ws.pipeline !== null) {
          ws.pipeline.done(stream, err);
        }
      }
    }
    function afterWrite(err) {
      const stream = this.stream;
      if (err) stream.destroy(err);
      stream._duplexState &= WRITE_NOT_ACTIVE;
      if (this.drains !== null) tickDrains(this.drains);
      if ((stream._duplexState & WRITE_DRAIN_STATUS) === WRITE_UNDRAINED) {
        stream._duplexState &= WRITE_DRAINED;
        if ((stream._duplexState & WRITE_EMIT_DRAIN) === WRITE_EMIT_DRAIN) {
          stream.emit("drain");
        }
      }
      this.updateCallback();
    }
    function afterRead(err) {
      if (err) this.stream.destroy(err);
      this.stream._duplexState &= READ_NOT_ACTIVE;
      if (this.readAhead === false && (this.stream._duplexState & READ_RESUMED) === 0) {
        this.stream._duplexState &= READ_NO_READ_AHEAD;
      }
      this.updateCallback();
    }
    function updateReadNT() {
      if ((this.stream._duplexState & READ_UPDATING) === 0) {
        this.stream._duplexState &= READ_NOT_NEXT_TICK;
        this.update();
      }
    }
    function updateWriteNT() {
      if ((this.stream._duplexState & WRITE_UPDATING) === 0) {
        this.stream._duplexState &= WRITE_NOT_NEXT_TICK;
        this.update();
      }
    }
    function tickDrains(drains) {
      for (let i = 0; i < drains.length; i++) {
        if (--drains[i].writes === 0) {
          drains.shift().resolve(true);
          i--;
        }
      }
    }
    function afterOpen(err) {
      const stream = this.stream;
      if (err) stream.destroy(err);
      if ((stream._duplexState & DESTROYING) === 0) {
        if ((stream._duplexState & READ_PRIMARY_STATUS) === 0) {
          stream._duplexState |= READ_PRIMARY;
        }
        if ((stream._duplexState & WRITE_PRIMARY_STATUS) === 0) {
          stream._duplexState |= WRITE_PRIMARY;
        }
        stream.emit("open");
      }
      stream._duplexState &= NOT_ACTIVE;
      if (stream._writableState !== null) {
        stream._writableState.updateCallback();
      }
      if (stream._readableState !== null) {
        stream._readableState.updateCallback();
      }
    }
    function afterTransform(err, data) {
      if (data !== void 0 && data !== null) this.push(data);
      this._writableState.afterWrite(err);
    }
    function newListener(name) {
      if (this._readableState !== null) {
        if (name === "data") {
          this._duplexState |= READ_EMIT_DATA | READ_RESUMED_READ_AHEAD;
          this._readableState.updateNextTick();
        }
        if (name === "readable") {
          this._duplexState |= READ_EMIT_READABLE;
          this._readableState.updateNextTick();
        }
      }
      if (this._writableState !== null) {
        if (name === "drain") {
          this._duplexState |= WRITE_EMIT_DRAIN;
          this._writableState.updateNextTick();
        }
      }
    }
    var Stream = class extends EventEmitter {
      constructor(opts) {
        super();
        this._duplexState = 0;
        this._readableState = null;
        this._writableState = null;
        if (opts) {
          if (opts.open) this._open = opts.open;
          if (opts.destroy) this._destroy = opts.destroy;
          if (opts.predestroy) this._predestroy = opts.predestroy;
          if (opts.signal) opts.signal.addEventListener("abort", abort.bind(this));
        }
        this.on("newListener", newListener);
      }
      _open(cb) {
        cb(null);
      }
      _destroy(cb) {
        cb(null);
      }
      _predestroy() {
      }
      get readable() {
        return this._readableState !== null ? true : void 0;
      }
      get writable() {
        return this._writableState !== null ? true : void 0;
      }
      get destroyed() {
        return (this._duplexState & DESTROYED) !== 0;
      }
      get destroying() {
        return (this._duplexState & DESTROY_STATUS) !== 0;
      }
      destroy(err) {
        if ((this._duplexState & DESTROY_STATUS) === 0) {
          if (!err) err = StreamError.STREAM_DESTROYED();
          this._duplexState = (this._duplexState | DESTROYING) & NON_PRIMARY;
          if (this._readableState !== null) {
            this._readableState.highWaterMark = 0;
            this._readableState.error = err;
          }
          if (this._writableState !== null) {
            this._writableState.highWaterMark = 0;
            this._writableState.error = err;
          }
          this._duplexState |= PREDESTROYING;
          this._predestroy();
          this._duplexState &= NOT_PREDESTROYING;
          if (this._readableState !== null) {
            this._readableState.updateNextTick();
          }
          if (this._writableState !== null) {
            this._writableState.updateNextTick();
          }
        }
      }
    };
    var Readable2 = class _Readable extends Stream {
      constructor(opts) {
        super(opts);
        this._duplexState |= OPENING | WRITE_DONE | READ_READ_AHEAD;
        this._readableState = new ReadableState(this, opts);
        if (opts) {
          if (this._readableState.readAhead === false) this._duplexState &= READ_NO_READ_AHEAD;
          if (opts.read) this._read = opts.read;
          if (opts.eagerOpen) this._readableState.updateNextTick();
          if (opts.encoding) this.setEncoding(opts.encoding);
        }
      }
      static deferred(fn, opts) {
        const out = new PassThrough(opts);
        fn().then((src) => {
          if (src === null) return out.end();
          if (out.destroying) return;
          pipeline2(src, out, noop);
        }).catch((err) => out.destroy(err));
        return out;
      }
      setEncoding(encoding) {
        const dec = new TextDecoder2(encoding);
        const map = this._readableState.map || echo;
        this._readableState.map = mapOrSkip;
        return this;
        function mapOrSkip(data) {
          const next = dec.push(data);
          return next === "" && (data.byteLength !== 0 || dec.remaining > 0) ? null : map(next);
        }
      }
      _read(cb) {
        cb(null);
      }
      pipe(dest, cb) {
        this._readableState.updateNextTick();
        this._readableState.pipe(dest, cb);
        return dest;
      }
      read() {
        this._readableState.updateNextTick();
        return this._readableState.read();
      }
      push(data) {
        this._readableState.updateNextTickIfOpen();
        return this._readableState.push(data);
      }
      unshift(data) {
        this._readableState.updateNextTickIfOpen();
        return this._readableState.unshift(data);
      }
      resume() {
        this._duplexState |= READ_RESUMED_READ_AHEAD;
        this._readableState.updateNextTick();
        return this;
      }
      pause() {
        this._duplexState &= this._readableState.readAhead === false ? READ_PAUSED_NO_READ_AHEAD : READ_PAUSED;
        return this;
      }
      static _fromAsyncIterator(ite, opts) {
        let destroy;
        const rs = new _Readable({
          ...opts,
          read(cb) {
            ite.next().then(push).then(cb.bind(null, null)).catch(cb);
          },
          predestroy() {
            destroy = ite.return();
          },
          destroy(cb) {
            if (!destroy) return cb(null);
            destroy.then(cb.bind(null, null)).catch(cb);
          }
        });
        return rs;
        function push(data) {
          if (data.done) rs.push(null);
          else rs.push(data.value);
        }
      }
      static from(data, opts) {
        if (isReadStreamx(data)) return data;
        if (data[asyncIterator]) return this._fromAsyncIterator(data[asyncIterator](), opts);
        if (!Array.isArray(data)) data = data === void 0 ? [] : [data];
        let i = 0;
        return new _Readable({
          ...opts,
          read(cb) {
            this.push(i === data.length ? null : data[i++]);
            cb(null);
          }
        });
      }
      static isBackpressured(rs) {
        return (rs._duplexState & READ_BACKPRESSURE_STATUS) !== 0 || rs._readableState.buffered >= rs._readableState.highWaterMark;
      }
      static isPaused(rs) {
        return (rs._duplexState & READ_RESUMED) === 0;
      }
      [asyncIterator]() {
        const stream = this;
        let error = null;
        let promiseResolve = null;
        let promiseReject = null;
        this.on("error", (err) => {
          error = err;
        });
        this.on("readable", onreadable);
        this.on("close", onclose);
        return {
          [asyncIterator]() {
            return this;
          },
          next() {
            return new Promise(function(resolve, reject) {
              promiseResolve = resolve;
              promiseReject = reject;
              const data = stream.read();
              if (data !== null) ondata(data);
              else if ((stream._duplexState & DESTROYED) !== 0) ondata(null);
            });
          },
          return() {
            return destroy(null);
          },
          throw(err) {
            return destroy(err);
          }
        };
        function onreadable() {
          if (promiseResolve !== null) ondata(stream.read());
        }
        function onclose() {
          if (promiseResolve !== null) ondata(null);
        }
        function ondata(data) {
          if (promiseReject === null) return;
          if (error) {
            promiseReject(error);
          } else if (data === null && (stream._duplexState & READ_DONE) === 0) {
            promiseReject(StreamError.STREAM_DESTROYED());
          } else {
            promiseResolve({ value: data, done: data === null });
          }
          promiseReject = promiseResolve = null;
        }
        function destroy(err) {
          stream.destroy(err);
          return new Promise((resolve, reject) => {
            if (stream._duplexState & DESTROYED) return resolve({ value: void 0, done: true });
            stream.once("close", function() {
              if (err) reject(err);
              else resolve({ value: void 0, done: true });
            });
          });
        }
      }
    };
    var Writable2 = class extends Stream {
      constructor(opts) {
        super(opts);
        this._duplexState |= OPENING | READ_DONE;
        this._writableState = new WritableState(this, opts);
        if (opts) {
          if (opts.writev) this._writev = opts.writev;
          if (opts.write) this._write = opts.write;
          if (opts.final) this._final = opts.final;
          if (opts.eagerOpen) this._writableState.updateNextTick();
        }
      }
      cork() {
        this._duplexState |= WRITE_CORKED;
      }
      uncork() {
        this._duplexState &= WRITE_NOT_CORKED;
        this._writableState.updateNextTick();
      }
      _writev(batch, cb) {
        cb(null);
      }
      _write(data, cb) {
        this._writableState.autoBatch(data, cb);
      }
      _final(cb) {
        cb(null);
      }
      static isBackpressured(ws) {
        return (ws._duplexState & WRITE_BACKPRESSURE_STATUS) !== 0;
      }
      static drained(ws) {
        if (ws.destroyed) return Promise.resolve(false);
        const state = ws._writableState;
        const pending = isWritev(ws) ? Math.min(1, state.queue.length) : state.queue.length;
        const writes = pending + (ws._duplexState & WRITE_WRITING ? 1 : 0);
        if (writes === 0) return Promise.resolve(true);
        if (state.drains === null) state.drains = [];
        return new Promise((resolve) => {
          state.drains.push({ writes, resolve });
        });
      }
      write(data) {
        this._writableState.updateNextTick();
        return this._writableState.push(data);
      }
      end(data) {
        this._writableState.updateNextTick();
        this._writableState.end(data);
        return this;
      }
    };
    var Duplex = class extends Readable2 {
      // and Writable
      constructor(opts) {
        super(opts);
        this._duplexState = OPENING | this._duplexState & READ_READ_AHEAD;
        this._writableState = new WritableState(this, opts);
        if (opts) {
          if (opts.writev) this._writev = opts.writev;
          if (opts.write) this._write = opts.write;
          if (opts.final) this._final = opts.final;
        }
      }
      cork() {
        this._duplexState |= WRITE_CORKED;
      }
      uncork() {
        this._duplexState &= WRITE_NOT_CORKED;
        this._writableState.updateNextTick();
      }
      _writev(batch, cb) {
        cb(null);
      }
      _write(data, cb) {
        this._writableState.autoBatch(data, cb);
      }
      _final(cb) {
        cb(null);
      }
      write(data) {
        this._writableState.updateNextTick();
        return this._writableState.push(data);
      }
      end(data) {
        this._writableState.updateNextTick();
        this._writableState.end(data);
        return this;
      }
    };
    var Transform = class extends Duplex {
      constructor(opts) {
        super(opts);
        this._transformState = new TransformState(this);
        if (opts) {
          if (opts.transform) this._transform = opts.transform;
          if (opts.flush) this._flush = opts.flush;
        }
      }
      _write(data, cb) {
        if (this._readableState.buffered >= this._readableState.highWaterMark) {
          this._transformState.data = data;
        } else {
          this._transform(data, this._transformState.afterTransform);
        }
      }
      _read(cb) {
        if (this._transformState.data !== null) {
          const data = this._transformState.data;
          this._transformState.data = null;
          cb(null);
          this._transform(data, this._transformState.afterTransform);
        } else {
          cb(null);
        }
      }
      destroy(err) {
        super.destroy(err);
        if (this._transformState.data !== null) {
          this._transformState.data = null;
          this._transformState.afterTransform();
        }
      }
      _transform(data, cb) {
        cb(null, data);
      }
      _flush(cb) {
        cb(null);
      }
      _final(cb) {
        this._transformState.afterFinal = cb;
        this._flush(transformAfterFlush.bind(this));
      }
    };
    var PassThrough = class extends Transform {
    };
    function transformAfterFlush(err, data) {
      const cb = this._transformState.afterFinal;
      if (err) return cb(err);
      if (data !== null && data !== void 0) this.push(data);
      this.push(null);
      cb(null);
    }
    function pipelinePromise(...streams) {
      return new Promise((resolve, reject) => {
        return pipeline2(...streams, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }
    function pipeline2(stream, ...streams) {
      const all = Array.isArray(stream) ? [...stream, ...streams] : [stream, ...streams];
      const done = all.length && typeof all[all.length - 1] === "function" ? all.pop() : null;
      if (all.length < 2) throw StreamError.BAD_ARGUMENT("Pipeline requires at least 2 streams");
      let src = all[0];
      let dest = null;
      let error = null;
      for (let i = 1; i < all.length; i++) {
        dest = all[i];
        if (isStreamx(src)) {
          src.pipe(dest, onerror);
        } else {
          errorHandle(src, true, i > 1, onerror);
          src.pipe(dest);
        }
        src = dest;
      }
      if (done) {
        let fin = false;
        const autoDestroy = isStreamx(dest) || !!(dest._writableState && dest._writableState.autoDestroy);
        dest.on("error", (err) => {
          if (error === null) error = err;
        });
        dest.on("finish", () => {
          fin = true;
          if (!autoDestroy) done(error);
        });
        if (autoDestroy) {
          dest.on("close", () => done(error || (fin ? null : StreamError.PREMATURE_CLOSE())));
        }
      }
      return dest;
      function errorHandle(s, rd, wr, onerror2) {
        s.on("error", onerror2);
        s.on("close", onclose);
        function onclose() {
          if (rd && s._readableState && !s._readableState.ended) {
            return onerror2(StreamError.PREMATURE_CLOSE());
          }
          if (wr && s._writableState && !s._writableState.ended) {
            return onerror2(StreamError.PREMATURE_CLOSE());
          }
        }
      }
      function onerror(err) {
        if (!err || error) return;
        error = err;
        for (const s of all) {
          s.destroy(err);
        }
      }
    }
    function echo(s) {
      return s;
    }
    function isStream(stream) {
      return !!stream._readableState || !!stream._writableState;
    }
    function isStreamx(stream) {
      return typeof stream._duplexState === "number" && isStream(stream);
    }
    function isEnding(stream) {
      return !!stream._readableState && stream._readableState.ending;
    }
    function isEnded(stream) {
      return !!stream._readableState && stream._readableState.ended;
    }
    function isFinishing(stream) {
      return !!stream._writableState && stream._writableState.ending;
    }
    function isFinished(stream) {
      return !!stream._writableState && stream._writableState.ended;
    }
    function getStreamError(stream, opts = {}) {
      const err = stream._readableState && stream._readableState.error || stream._writableState && stream._writableState.error;
      return !opts.all && StreamError.isStreamDestroyed(err) ? null : err;
    }
    function isReadStreamx(stream) {
      return isStreamx(stream) && stream.readable;
    }
    function isDisturbed(stream) {
      return (stream._duplexState & OPENING) !== OPENING || (stream._duplexState & DESTROYING) === DESTROYING || (stream._duplexState & ACTIVE_OR_TICKING) !== 0;
    }
    function isTypedArray(data) {
      return typeof data === "object" && data !== null && typeof data.byteLength === "number";
    }
    function defaultByteLength(data) {
      return isTypedArray(data) ? data.byteLength : 1024;
    }
    function noop() {
    }
    function abort() {
      this.destroy(StreamError.ABORTED());
    }
    function isWritev(s) {
      return s._writev !== Writable2.prototype._writev && s._writev !== Duplex.prototype._writev;
    }
    module.exports = {
      pipeline: pipeline2,
      pipelinePromise,
      isStream,
      isStreamx,
      isEnding,
      isEnded,
      isFinishing,
      isFinished,
      isDisturbed,
      getStreamError,
      Stream,
      Writable: Writable2,
      Readable: Readable2,
      Duplex,
      Transform,
      // Export PassThrough for compatibility with Node.js core's stream module
      PassThrough
    };
  }
});

// node_modules/tar-stream/headers.js
var require_headers = __commonJS({
  "node_modules/tar-stream/headers.js"(exports) {
    var b4a = require_b4a();
    var ZEROS = "0000000000000000000";
    var SEVENS = "7777777777777777777";
    var ZERO_OFFSET = "0".charCodeAt(0);
    var USTAR_MAGIC = b4a.from([117, 115, 116, 97, 114, 0]);
    var USTAR_VER = b4a.from([ZERO_OFFSET, ZERO_OFFSET]);
    var GNU_MAGIC = b4a.from([117, 115, 116, 97, 114, 32]);
    var GNU_VER = b4a.from([32, 0]);
    var MASK = 4095;
    var MAGIC_OFFSET = 257;
    var VERSION_OFFSET = 263;
    exports.decodeLongPath = function decodeLongPath(buf, encoding) {
      return decodeStr(buf, 0, buf.length, encoding);
    };
    exports.encodePax = function encodePax(opts) {
      let result = "";
      if (opts.name) result += addLength(" path=" + opts.name + "\n");
      if (opts.linkname) result += addLength(" linkpath=" + opts.linkname + "\n");
      const pax = opts.pax;
      if (pax) {
        for (const key in pax) {
          result += addLength(" " + key + "=" + pax[key] + "\n");
        }
      }
      return b4a.from(result);
    };
    exports.decodePax = function decodePax(buf) {
      const result = {};
      while (buf.length) {
        let i = 0;
        while (i < buf.length && buf[i] !== 32) i++;
        const len = parseInt(b4a.toString(buf.subarray(0, i)), 10);
        if (!len) return result;
        const b2 = b4a.toString(buf.subarray(i + 1, len - 1));
        const keyIndex = b2.indexOf("=");
        if (keyIndex === -1) return result;
        result[b2.slice(0, keyIndex)] = b2.slice(keyIndex + 1);
        buf = buf.subarray(len);
      }
      return result;
    };
    exports.encode = function encode(opts) {
      const buf = b4a.alloc(512);
      let name = opts.name;
      let prefix = "";
      if (opts.typeflag === 5 && name[name.length - 1] !== "/") name += "/";
      if (b4a.byteLength(name) !== name.length) return null;
      while (b4a.byteLength(name) > 100) {
        const i = name.indexOf("/");
        if (i === -1) return null;
        prefix += prefix ? "/" + name.slice(0, i) : name.slice(0, i);
        name = name.slice(i + 1);
      }
      if (b4a.byteLength(name) > 100 || b4a.byteLength(prefix) > 155) return null;
      if (opts.linkname && b4a.byteLength(opts.linkname) > 100) return null;
      b4a.write(buf, name);
      b4a.write(buf, encodeOct(opts.mode & MASK, 6), 100);
      b4a.write(buf, encodeOct(opts.uid, 6), 108);
      b4a.write(buf, encodeOct(opts.gid, 6), 116);
      encodeSize(opts.size, buf, 124);
      b4a.write(buf, encodeOct(opts.mtime.getTime() / 1e3 | 0, 11), 136);
      buf[156] = ZERO_OFFSET + toTypeflag(opts.type);
      if (opts.linkname) b4a.write(buf, opts.linkname, 157);
      b4a.copy(USTAR_MAGIC, buf, MAGIC_OFFSET);
      b4a.copy(USTAR_VER, buf, VERSION_OFFSET);
      if (opts.uname) b4a.write(buf, opts.uname, 265);
      if (opts.gname) b4a.write(buf, opts.gname, 297);
      b4a.write(buf, encodeOct(opts.devmajor || 0, 6), 329);
      b4a.write(buf, encodeOct(opts.devminor || 0, 6), 337);
      if (prefix) b4a.write(buf, prefix, 345);
      b4a.write(buf, encodeOct(cksum(buf), 6), 148);
      return buf;
    };
    exports.decode = function decode(buf, filenameEncoding, allowUnknownFormat) {
      let typeflag = buf[156] === 0 ? 0 : buf[156] - ZERO_OFFSET;
      let name = decodeStr(buf, 0, 100, filenameEncoding);
      const mode = decodeOct(buf, 100, 8);
      const uid = decodeOct(buf, 108, 8);
      const gid = decodeOct(buf, 116, 8);
      const size = decodeOct(buf, 124, 12);
      const mtime = decodeOct(buf, 136, 12);
      const type = toType(typeflag);
      const linkname = buf[157] === 0 ? null : decodeStr(buf, 157, 100, filenameEncoding);
      const uname = decodeStr(buf, 265, 32);
      const gname = decodeStr(buf, 297, 32);
      const devmajor = decodeOct(buf, 329, 8);
      const devminor = decodeOct(buf, 337, 8);
      const c = cksum(buf);
      if (c === 8 * 32) return null;
      if (c !== decodeOct(buf, 148, 8)) throw new Error("Invalid tar header. Maybe the tar is corrupted or it needs to be gunzipped?");
      if (isUSTAR(buf)) {
        if (buf[345]) name = decodeStr(buf, 345, 155, filenameEncoding) + "/" + name;
      } else if (isGNU(buf)) {
      } else {
        if (!allowUnknownFormat) {
          throw new Error("Invalid tar header: unknown format.");
        }
      }
      if (typeflag === 0 && name && name[name.length - 1] === "/") typeflag = 5;
      return {
        name,
        mode,
        uid,
        gid,
        size,
        byteOffset: 0,
        mtime: new Date(1e3 * mtime),
        type,
        linkname,
        uname,
        gname,
        devmajor,
        devminor,
        pax: null
      };
    };
    function isUSTAR(buf) {
      return b4a.equals(USTAR_MAGIC, buf.subarray(MAGIC_OFFSET, MAGIC_OFFSET + 6));
    }
    function isGNU(buf) {
      return b4a.equals(GNU_MAGIC, buf.subarray(MAGIC_OFFSET, MAGIC_OFFSET + 6)) && b4a.equals(GNU_VER, buf.subarray(VERSION_OFFSET, VERSION_OFFSET + 2));
    }
    function clamp(index, len, defaultValue) {
      if (typeof index !== "number") return defaultValue;
      index = ~~index;
      if (index >= len) return len;
      if (index >= 0) return index;
      index += len;
      if (index >= 0) return index;
      return 0;
    }
    function toType(flag) {
      switch (flag) {
        case 0:
          return "file";
        case 1:
          return "link";
        case 2:
          return "symlink";
        case 3:
          return "character-device";
        case 4:
          return "block-device";
        case 5:
          return "directory";
        case 6:
          return "fifo";
        case 7:
          return "contiguous-file";
        case 72:
          return "pax-header";
        case 55:
          return "pax-global-header";
        case 27:
          return "gnu-long-link-path";
        case 28:
        case 30:
          return "gnu-long-path";
      }
      return null;
    }
    function toTypeflag(flag) {
      switch (flag) {
        case "file":
          return 0;
        case "link":
          return 1;
        case "symlink":
          return 2;
        case "character-device":
          return 3;
        case "block-device":
          return 4;
        case "directory":
          return 5;
        case "fifo":
          return 6;
        case "contiguous-file":
          return 7;
        case "pax-header":
          return 72;
      }
      return 0;
    }
    function indexOf(block, num, offset, end) {
      for (; offset < end; offset++) {
        if (block[offset] === num) return offset;
      }
      return end;
    }
    function cksum(block) {
      let sum2 = 8 * 32;
      for (let i = 0; i < 148; i++) sum2 += block[i];
      for (let j2 = 156; j2 < 512; j2++) sum2 += block[j2];
      return sum2;
    }
    function encodeOct(val, n) {
      val = val.toString(8);
      if (val.length > n) return SEVENS.slice(0, n) + " ";
      return ZEROS.slice(0, n - val.length) + val + " ";
    }
    function encodeSizeBin(num, buf, off) {
      buf[off] = 128;
      for (let i = 11; i > 0; i--) {
        buf[off + i] = num & 255;
        num = Math.floor(num / 256);
      }
    }
    function encodeSize(num, buf, off) {
      if (num.toString(8).length > 11) {
        encodeSizeBin(num, buf, off);
      } else {
        b4a.write(buf, encodeOct(num, 11), off);
      }
    }
    function parse256(buf) {
      let positive;
      if (buf[0] === 128) positive = true;
      else if (buf[0] === 255) positive = false;
      else return null;
      const tuple = [];
      let i;
      for (i = buf.length - 1; i > 0; i--) {
        const byte = buf[i];
        if (positive) tuple.push(byte);
        else tuple.push(255 - byte);
      }
      let sum2 = 0;
      const l = tuple.length;
      for (i = 0; i < l; i++) {
        sum2 += tuple[i] * Math.pow(256, i);
      }
      return positive ? sum2 : -1 * sum2;
    }
    function decodeOct(val, offset, length) {
      val = val.subarray(offset, offset + length);
      offset = 0;
      if (val[offset] & 128) {
        return parse256(val);
      } else {
        while (offset < val.length && val[offset] === 32) offset++;
        const end = clamp(indexOf(val, 32, offset, val.length), val.length, val.length);
        while (offset < end && val[offset] === 0) offset++;
        if (end === offset) return 0;
        return parseInt(b4a.toString(val.subarray(offset, end)), 8);
      }
    }
    function decodeStr(val, offset, length, encoding) {
      return b4a.toString(val.subarray(offset, indexOf(val, 0, offset, offset + length)), encoding);
    }
    function addLength(str) {
      const len = b4a.byteLength(str);
      let digits = Math.floor(Math.log(len) / Math.log(10)) + 1;
      if (len + digits >= Math.pow(10, digits)) digits++;
      return len + digits + str;
    }
  }
});

// node_modules/tar-stream/extract.js
var require_extract = __commonJS({
  "node_modules/tar-stream/extract.js"(exports, module) {
    var { Writable: Writable2, Readable: Readable2, getStreamError } = require_streamx();
    var FIFO = require_fast_fifo();
    var b4a = require_b4a();
    var headers = require_headers();
    var EMPTY = b4a.alloc(0);
    var MAX_HEADER_SIZE = 4 * 1024 * 1024;
    var BufferList = class {
      constructor() {
        this.buffered = 0;
        this.shifted = 0;
        this.queue = new FIFO();
        this._offset = 0;
      }
      push(buffer) {
        this.buffered += buffer.byteLength;
        this.queue.push(buffer);
      }
      shiftFirst(size) {
        return this.buffered === 0 ? null : this._next(size);
      }
      shift(size) {
        if (size > this.buffered) return null;
        if (size === 0) return EMPTY;
        let chunk = this._next(size);
        if (size === chunk.byteLength) return chunk;
        const chunks = [chunk];
        while ((size -= chunk.byteLength) > 0) {
          chunk = this._next(size);
          chunks.push(chunk);
        }
        return b4a.concat(chunks);
      }
      _next(size) {
        const buf = this.queue.peek();
        const rem = buf.byteLength - this._offset;
        if (size >= rem) {
          const sub = this._offset ? buf.subarray(this._offset, buf.byteLength) : buf;
          this.queue.shift();
          this._offset = 0;
          this.buffered -= rem;
          this.shifted += rem;
          return sub;
        }
        this.buffered -= size;
        this.shifted += size;
        return buf.subarray(this._offset, this._offset += size);
      }
    };
    var Source = class extends Readable2 {
      constructor(self, header, offset) {
        super();
        this.header = header;
        this.offset = offset;
        this._parent = self;
      }
      _read(cb) {
        if (this.header.size === 0) {
          this.push(null);
        }
        if (this._parent._stream === this) {
          this._parent._update();
        }
        cb(null);
      }
      _predestroy() {
        this._parent.destroy(getStreamError(this));
      }
      _detach() {
        if (this._parent._stream === this) {
          this._parent._stream = null;
          this._parent._missing = overflow(this.header.size);
          this._parent._update();
        }
      }
      _destroy(cb) {
        this._detach();
        cb(null);
      }
    };
    var Extract = class extends Writable2 {
      constructor(opts) {
        super(opts);
        if (!opts) opts = {};
        this._buffer = new BufferList();
        this._offset = 0;
        this._header = null;
        this._stream = null;
        this._missing = 0;
        this._longHeader = false;
        this._callback = noop;
        this._locked = false;
        this._finished = false;
        this._pax = null;
        this._paxGlobal = null;
        this._gnuLongPath = null;
        this._gnuLongLinkPath = null;
        this._filenameEncoding = opts.filenameEncoding || "utf-8";
        this._allowUnknownFormat = !!opts.allowUnknownFormat;
        this._unlockBound = this._unlock.bind(this);
      }
      _unlock(err) {
        this._locked = false;
        if (err) {
          this.destroy(err);
          this._continueWrite(err);
          return;
        }
        this._update();
      }
      _consumeHeader() {
        if (this._locked) return false;
        this._offset = this._buffer.shifted;
        try {
          this._header = headers.decode(this._buffer.shift(512), this._filenameEncoding, this._allowUnknownFormat);
        } catch (err) {
          this._continueWrite(err);
          return false;
        }
        if (!this._header) return true;
        this._header.byteOffset = this._buffer.shifted;
        switch (this._header.type) {
          case "gnu-long-path":
          case "gnu-long-link-path":
          case "pax-global-header":
          case "pax-header":
            this._longHeader = true;
            this._missing = this._header.size;
            if (this._missing > MAX_HEADER_SIZE) {
              this._continueWrite(new Error("Header exceeds max size"));
              return false;
            }
            return true;
        }
        this._locked = true;
        this._applyLongHeaders();
        if (!(this._header.size >= 0)) {
          this._continueWrite(new Error("Invalid header"));
          return false;
        }
        if (this._header.size === 0 || this._header.type === "directory") {
          this.emit("entry", this._header, this._createStream(), this._unlockBound);
          return true;
        }
        this._stream = this._createStream();
        this._missing = this._header.size;
        this.emit("entry", this._header, this._stream, this._unlockBound);
        return true;
      }
      _applyLongHeaders() {
        if (this._gnuLongPath) {
          this._header.name = this._gnuLongPath;
          this._gnuLongPath = null;
        }
        if (this._gnuLongLinkPath) {
          this._header.linkname = this._gnuLongLinkPath;
          this._gnuLongLinkPath = null;
        }
        if (this._pax) {
          if (this._pax.path) this._header.name = this._pax.path;
          if (this._pax.linkpath) this._header.linkname = this._pax.linkpath;
          if (this._pax.size) this._header.size = parseInt(this._pax.size, 10);
          this._header.pax = this._pax;
          this._pax = null;
        }
      }
      _decodeLongHeader(buf) {
        switch (this._header.type) {
          case "gnu-long-path":
            this._gnuLongPath = headers.decodeLongPath(buf, this._filenameEncoding);
            break;
          case "gnu-long-link-path":
            this._gnuLongLinkPath = headers.decodeLongPath(buf, this._filenameEncoding);
            break;
          case "pax-global-header":
            this._paxGlobal = headers.decodePax(buf);
            break;
          case "pax-header":
            this._pax = this._paxGlobal === null ? headers.decodePax(buf) : Object.assign({}, this._paxGlobal, headers.decodePax(buf));
            break;
        }
      }
      _consumeLongHeader() {
        this._longHeader = false;
        this._missing = overflow(this._header.size);
        const buf = this._buffer.shift(this._header.size);
        try {
          this._decodeLongHeader(buf);
        } catch (err) {
          this._continueWrite(err);
          return false;
        }
        return true;
      }
      _consumeStream() {
        const buf = this._buffer.shiftFirst(this._missing);
        if (buf === null) return false;
        this._missing -= buf.byteLength;
        const drained = this._stream.push(buf);
        if (this._missing === 0) {
          this._stream.push(null);
          if (drained) this._stream._detach();
          return drained && this._locked === false;
        }
        return drained;
      }
      _createStream() {
        return new Source(this, this._header, this._offset);
      }
      _update() {
        while (this._buffer.buffered > 0 && !this.destroying) {
          if (this._missing > 0) {
            if (this._stream !== null) {
              if (this._consumeStream() === false) return;
              continue;
            }
            if (this._longHeader === true) {
              if (this._missing > this._buffer.buffered) break;
              if (this._consumeLongHeader() === false) return false;
              continue;
            }
            const ignore = this._buffer.shiftFirst(this._missing);
            if (ignore !== null) this._missing -= ignore.byteLength;
            continue;
          }
          if (this._buffer.buffered < 512) break;
          if (this._stream !== null || this._consumeHeader() === false) return;
        }
        this._continueWrite(null);
      }
      _continueWrite(err) {
        const cb = this._callback;
        this._callback = noop;
        cb(err);
      }
      _write(data, cb) {
        this._callback = cb;
        this._buffer.push(data);
        this._update();
      }
      _final(cb) {
        this._finished = this._missing === 0 && this._buffer.buffered === 0;
        cb(this._finished ? null : new Error("Unexpected end of data"));
      }
      _predestroy() {
        this._continueWrite(null);
      }
      _destroy(cb) {
        if (this._stream) this._stream.destroy(getStreamError(this));
        cb(null);
      }
      [Symbol.asyncIterator]() {
        let error = null;
        let promiseResolve = null;
        let promiseReject = null;
        let entryStream = null;
        let entryCallback = null;
        const extract2 = this;
        this.on("entry", onentry);
        this.on("error", (err) => {
          error = err;
        });
        this.on("close", onclose);
        return {
          [Symbol.asyncIterator]() {
            return this;
          },
          next() {
            return new Promise(onnext);
          },
          return() {
            return destroy(null);
          },
          throw(err) {
            return destroy(err);
          }
        };
        function consumeCallback(err) {
          if (!entryCallback) return;
          const cb = entryCallback;
          entryCallback = null;
          cb(err);
        }
        function onnext(resolve, reject) {
          if (error) {
            return reject(error);
          }
          if (entryStream) {
            resolve({ value: entryStream, done: false });
            entryStream = null;
            return;
          }
          promiseResolve = resolve;
          promiseReject = reject;
          consumeCallback(null);
          if (extract2._finished && promiseResolve) {
            promiseResolve({ value: void 0, done: true });
            promiseResolve = promiseReject = null;
          }
        }
        function onentry(header, stream, callback) {
          entryCallback = callback;
          stream.on("error", noop);
          if (promiseResolve) {
            promiseResolve({ value: stream, done: false });
            promiseResolve = promiseReject = null;
          } else {
            entryStream = stream;
          }
        }
        function onclose() {
          consumeCallback(error);
          if (!promiseResolve) return;
          if (error) promiseReject(error);
          else promiseResolve({ value: void 0, done: true });
          promiseResolve = promiseReject = null;
        }
        function destroy(err) {
          extract2.destroy(err);
          consumeCallback(err);
          return new Promise((resolve, reject) => {
            if (extract2.destroyed) return resolve({ value: void 0, done: true });
            extract2.once("close", function() {
              if (err) reject(err);
              else resolve({ value: void 0, done: true });
            });
          });
        }
      }
    };
    module.exports = function extract2(opts) {
      return new Extract(opts);
    };
    function noop() {
    }
    function overflow(size) {
      size &= 511;
      return size && 512 - size;
    }
  }
});

// node_modules/tar-stream/constants.js
var require_constants = __commonJS({
  "node_modules/tar-stream/constants.js"(exports, module) {
    var constants = {
      // just for envs without fs
      S_IFMT: 61440,
      S_IFDIR: 16384,
      S_IFCHR: 8192,
      S_IFBLK: 24576,
      S_IFIFO: 4096,
      S_IFLNK: 40960
    };
    try {
      module.exports = __require("fs").constants || constants;
    } catch {
      module.exports = constants;
    }
  }
});

// node_modules/tar-stream/pack.js
var require_pack = __commonJS({
  "node_modules/tar-stream/pack.js"(exports, module) {
    var { Readable: Readable2, Writable: Writable2, getStreamError } = require_streamx();
    var b4a = require_b4a();
    var constants = require_constants();
    var headers = require_headers();
    var DMODE = 493;
    var FMODE = 420;
    var END_OF_TAR = b4a.alloc(1024);
    var Sink = class extends Writable2 {
      constructor(pack2, header, callback) {
        super({ mapWritable, eagerOpen: true });
        this.written = 0;
        this.header = header;
        this._callback = callback;
        this._linkname = null;
        this._isLinkname = header.type === "symlink" && !header.linkname;
        this._isVoid = header.type !== "file" && header.type !== "contiguous-file";
        this._finished = false;
        this._pack = pack2;
        this._openCallback = null;
        if (this._pack._stream === null) this._pack._stream = this;
        else this._pack._pending.push(this);
      }
      _open(cb) {
        this._openCallback = cb;
        if (this._pack._stream === this) this._continueOpen();
      }
      _continuePack(err) {
        if (this._callback === null) return;
        const callback = this._callback;
        this._callback = null;
        callback(err);
      }
      _continueOpen() {
        if (this._pack._stream === null) this._pack._stream = this;
        const cb = this._openCallback;
        this._openCallback = null;
        if (cb === null) return;
        if (this._pack.destroying) return cb(new Error("pack stream destroyed"));
        if (this._pack._finalized) return cb(new Error("pack stream is already finalized"));
        this._pack._stream = this;
        if (!this._isLinkname) {
          this._pack._encode(this.header);
        }
        if (this._isVoid) {
          this._finish();
          this._continuePack(null);
        }
        cb(null);
      }
      _write(data, cb) {
        if (this._isLinkname) {
          this._linkname = this._linkname ? b4a.concat([this._linkname, data]) : data;
          return cb(null);
        }
        if (this._isVoid) {
          if (data.byteLength > 0) {
            return cb(new Error("No body allowed for this entry"));
          }
          return cb();
        }
        this.written += data.byteLength;
        if (this._pack.push(data)) return cb();
        this._pack._drain = cb;
      }
      _finish() {
        if (this._finished) return;
        this._finished = true;
        if (this._isLinkname) {
          this.header.linkname = this._linkname ? b4a.toString(this._linkname, "utf-8") : "";
          this._pack._encode(this.header);
        }
        overflow(this._pack, this.header.size);
        this._pack._done(this);
      }
      _final(cb) {
        if (this.written !== this.header.size) {
          return cb(new Error("Size mismatch"));
        }
        this._finish();
        cb(null);
      }
      _getError() {
        return getStreamError(this) || new Error("tar entry destroyed");
      }
      _predestroy() {
        this._pack.destroy(this._getError());
      }
      _destroy(cb) {
        this._pack._done(this);
        this._continuePack(this._finished ? null : this._getError());
        cb();
      }
    };
    var Pack = class extends Readable2 {
      constructor(opts) {
        super(opts);
        this._drain = noop;
        this._finalized = false;
        this._finalizing = false;
        this._pending = [];
        this._stream = null;
      }
      entry(header, buffer, callback) {
        if (this._finalized || this.destroying) throw new Error("already finalized or destroyed");
        if (typeof buffer === "function") {
          callback = buffer;
          buffer = null;
        }
        if (!callback) callback = noop;
        if (!header.size || header.type === "symlink") header.size = 0;
        if (!header.type) header.type = modeToType(header.mode);
        if (!header.mode) header.mode = header.type === "directory" ? DMODE : FMODE;
        if (!header.uid) header.uid = 0;
        if (!header.gid) header.gid = 0;
        if (!header.mtime) header.mtime = /* @__PURE__ */ new Date();
        if (typeof buffer === "string") buffer = b4a.from(buffer);
        const sink = new Sink(this, header, callback);
        if (b4a.isBuffer(buffer)) {
          header.size = buffer.byteLength;
          sink.write(buffer);
          sink.end();
          return sink;
        }
        if (sink._isVoid) {
          return sink;
        }
        return sink;
      }
      finalize() {
        if (this._stream || this._pending.length > 0) {
          this._finalizing = true;
          return;
        }
        if (this._finalized) return;
        this._finalized = true;
        this.push(END_OF_TAR);
        this.push(null);
      }
      _done(stream) {
        if (stream !== this._stream) return;
        this._stream = null;
        if (this._finalizing) this.finalize();
        if (this._pending.length) this._pending.shift()._continueOpen();
      }
      _encode(header) {
        if (!header.pax) {
          const buf = headers.encode(header);
          if (buf) {
            this.push(buf);
            return;
          }
        }
        this._encodePax(header);
      }
      _encodePax(header) {
        const paxHeader = headers.encodePax({
          name: header.name,
          linkname: header.linkname,
          pax: header.pax
        });
        const newHeader = {
          name: "PaxHeader",
          mode: header.mode,
          uid: header.uid,
          gid: header.gid,
          size: paxHeader.byteLength,
          mtime: header.mtime,
          type: "pax-header",
          linkname: header.linkname && "PaxHeader",
          uname: header.uname,
          gname: header.gname,
          devmajor: header.devmajor,
          devminor: header.devminor
        };
        this.push(headers.encode(newHeader));
        this.push(paxHeader);
        overflow(this, paxHeader.byteLength);
        newHeader.size = header.size;
        newHeader.type = header.type;
        this.push(headers.encode(newHeader));
      }
      _doDrain() {
        const drain = this._drain;
        this._drain = noop;
        drain();
      }
      _predestroy() {
        const err = getStreamError(this);
        if (this._stream) this._stream.destroy(err);
        while (this._pending.length) {
          const stream = this._pending.shift();
          stream.destroy(err);
          stream._continueOpen();
        }
        this._doDrain();
      }
      _read(cb) {
        this._doDrain();
        cb();
      }
    };
    module.exports = function pack2(opts) {
      return new Pack(opts);
    };
    function modeToType(mode) {
      switch (mode & constants.S_IFMT) {
        case constants.S_IFBLK:
          return "block-device";
        case constants.S_IFCHR:
          return "character-device";
        case constants.S_IFDIR:
          return "directory";
        case constants.S_IFIFO:
          return "fifo";
        case constants.S_IFLNK:
          return "symlink";
      }
      return "file";
    }
    function noop() {
    }
    function overflow(self, size) {
      size &= 511;
      if (size) self.push(END_OF_TAR.subarray(0, 512 - size));
    }
    function mapWritable(buf) {
      return b4a.isBuffer(buf) ? buf : b4a.from(buf);
    }
  }
});

// node_modules/tar-stream/index.js
var require_tar_stream = __commonJS({
  "node_modules/tar-stream/index.js"(exports) {
    exports.extract = require_extract();
    exports.pack = require_pack();
  }
});

// node_modules/skillflag/dist/shared/frontmatter.js
function stripYamlQuotes(value) {
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).trim();
  }
  return value;
}
function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatterMatch) {
    return {};
  }
  const block = frontmatterMatch[1];
  const lines = block.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const fields = {};
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1)
      continue;
    const key = line.slice(0, idx).trim();
    const value = stripYamlQuotes(line.slice(idx + 1).trim());
    if (key && value) {
      fields[key] = value;
    }
  }
  return fields;
}
var init_frontmatter = __esm({
  "node_modules/skillflag/dist/shared/frontmatter.js"() {
  }
});

// node_modules/skillflag/dist/utils/collections.js
function uniqueValues(values) {
  const out = [];
  for (const value of values) {
    if (!out.includes(value)) {
      out.push(value);
    }
  }
  return out;
}
var init_collections = __esm({
  "node_modules/skillflag/dist/utils/collections.js"() {
  }
});

// node_modules/skillflag/dist/install/errors.js
function toErrorMessage2(err) {
  if (err instanceof Error)
    return err.message;
  return String(err);
}
var InstallError;
var init_errors = __esm({
  "node_modules/skillflag/dist/install/errors.js"() {
    InstallError = class extends Error {
      exitCode;
      constructor(message, exitCode = 1) {
        super(message);
        this.exitCode = exitCode;
      }
    };
  }
});

// node_modules/skillflag/dist/install/validate.js
import fs5 from "node:fs/promises";
import path5 from "node:path";
async function assertSkillDir(rootDir) {
  const skillMd = path5.join(rootDir, "SKILL.md");
  try {
    await fs5.access(skillMd);
  } catch {
    throw new InstallError("SKILL.md not found in skill root.");
  }
}
async function readSkillMetadata(rootDir) {
  const skillMdPath = path5.join(rootDir, "SKILL.md");
  const content = await fs5.readFile(skillMdPath, "utf8");
  const fields = parseFrontmatter(content);
  const name = fields.name;
  const description = fields.description;
  if (!name) {
    throw new InstallError("SKILL.md metadata is missing name.");
  }
  if (!description) {
    throw new InstallError("SKILL.md metadata is missing description.");
  }
  return { name, description };
}
var init_validate = __esm({
  "node_modules/skillflag/dist/install/validate.js"() {
    init_errors();
    init_frontmatter();
  }
});

// node_modules/skillflag/dist/install/extract.js
import fs6 from "node:fs/promises";
import path6 from "node:path";
function isInvalidRelPath2(relPosix) {
  if (path6.posix.isAbsolute(relPosix))
    return true;
  const parts = relPosix.split("/");
  return parts.includes("..") || parts.some((part) => part.length === 0);
}
async function extractSkillTarToTemp(stream, tempDir) {
  const extract2 = tar2.extract();
  let rootName = null;
  const done = new Promise((resolve, reject) => {
    extract2.on("entry", async (header, entryStream, next) => {
      try {
        const rawName = header.name;
        if (!rawName || rawName.includes("\\")) {
          throw new InstallError(`Invalid path in tar: ${rawName}`);
        }
        const name = rawName.endsWith("/") ? rawName.slice(0, -1) : rawName;
        if (!name || isInvalidRelPath2(name)) {
          throw new InstallError(`Invalid path in tar: ${rawName}`);
        }
        const [top, ...rest] = name.split("/");
        if (!top) {
          throw new InstallError(`Invalid tar entry name: ${rawName}`);
        }
        if (!rootName)
          rootName = top;
        if (rootName !== top) {
          throw new InstallError("Tar must contain a single top-level directory.");
        }
        const relPath = rest.join("/");
        const absPath = relPath ? path6.join(tempDir, top, relPath) : path6.join(tempDir, top);
        if (header.type === "directory") {
          await fs6.mkdir(absPath, { recursive: true });
          entryStream.resume();
          entryStream.on("end", next);
          return;
        }
        if (header.type === "file") {
          if (!relPath) {
            throw new InstallError("Tar must contain a single top-level directory.");
          }
          await fs6.mkdir(path6.dirname(absPath), { recursive: true });
          const chunks = [];
          entryStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          entryStream.on("end", async () => {
            await fs6.writeFile(absPath, Buffer.concat(chunks));
            next();
          });
          return;
        }
        throw new InstallError(`Unsupported tar entry type: ${header.type}`);
      } catch (err) {
        entryStream.resume();
        reject(err);
      }
    });
    extract2.on("finish", () => {
      if (!rootName) {
        reject(new InstallError("Tar stream was empty."));
        return;
      }
      resolve(path6.join(tempDir, rootName));
    });
    extract2.on("error", (err) => reject(err));
  });
  stream.pipe(extract2);
  return done;
}
var tar2;
var init_extract = __esm({
  "node_modules/skillflag/dist/install/extract.js"() {
    tar2 = __toESM(require_tar_stream(), 1);
    init_errors();
  }
});

// node_modules/skillflag/dist/install/resolve.js
import os from "node:os";
import path7 from "node:path";
import { execFileSync } from "node:child_process";
function resolveRepoRoot(cwd) {
  try {
    const out = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8"
    }).trim();
    if (out)
      return out;
  } catch {
  }
  return cwd;
}
function configRoot() {
  return process.env.XDG_CONFIG_HOME ?? path7.join(os.homedir(), ".config");
}
function assertAgent(value) {
  if (AGENTS.includes(value)) {
    return value;
  }
  throw new InstallError(`Unsupported agent: ${value}`);
}
function assertScope(value) {
  if (SCOPES.includes(value)) {
    return value;
  }
  throw new InstallError(`Unsupported scope: ${value}`);
}
function supportedScopesForAgent(agent) {
  return Object.keys(scopeResolversByAgent[agent]);
}
function sharedScopesForAgents(agents) {
  const uniqueAgents = uniqueValues(agents);
  if (uniqueAgents.length === 0) {
    return [];
  }
  const first = uniqueAgents[0];
  return supportedScopesForAgent(first).filter((scope) => uniqueAgents.every((agent) => supportedScopesForAgent(agent).includes(scope)));
}
function assertSupportedAgentScopes(agents, scopes) {
  for (const agent of uniqueValues(agents)) {
    const supported = supportedScopesForAgent(agent);
    for (const scope of uniqueValues(scopes)) {
      if (!supported.includes(scope)) {
        throw new InstallError(`Unsupported agent/scope: ${agent} ${scope}`);
      }
    }
  }
}
function resolveSkillsRoot2(agent, scope, cwd) {
  const resolver = scopeResolversByAgent[agent][scope];
  if (!resolver) {
    throw new InstallError(`Unsupported agent/scope: ${agent} ${scope}`);
  }
  return resolver(cwd);
}
var AGENTS, SCOPES, scopeResolversByAgent;
var init_resolve = __esm({
  "node_modules/skillflag/dist/install/resolve.js"() {
    init_errors();
    init_collections();
    AGENTS = [
      "codex",
      "claude",
      "portable",
      "vscode",
      "copilot",
      "amp",
      "goose",
      "opencode",
      "factory",
      "cursor"
    ];
    SCOPES = ["repo", "user", "cwd"];
    scopeResolversByAgent = {
      codex: {
        repo: (cwd) => path7.join(resolveRepoRoot(cwd), ".codex/skills"),
        cwd: (cwd) => path7.join(cwd, ".codex/skills"),
        user: () => {
          const root = process.env.CODEX_HOME ?? path7.join(os.homedir(), ".codex");
          return path7.join(root, "skills");
        }
      },
      claude: {
        repo: (cwd) => path7.join(resolveRepoRoot(cwd), ".claude/skills"),
        user: () => path7.join(os.homedir(), ".claude/skills")
      },
      portable: {
        repo: (cwd) => path7.join(resolveRepoRoot(cwd), ".agents/skills"),
        user: () => path7.join(configRoot(), "agents/skills")
      },
      vscode: {
        repo: (cwd) => path7.join(resolveRepoRoot(cwd), ".github/skills")
      },
      copilot: {
        repo: (cwd) => path7.join(resolveRepoRoot(cwd), ".github/skills")
      },
      amp: {
        repo: (cwd) => path7.join(resolveRepoRoot(cwd), ".agents/skills"),
        user: () => path7.join(configRoot(), "agents/skills")
      },
      goose: {
        repo: (cwd) => path7.join(resolveRepoRoot(cwd), ".agents/skills"),
        user: () => path7.join(configRoot(), "agents/skills")
      },
      opencode: {
        repo: (cwd) => path7.join(resolveRepoRoot(cwd), ".opencode/skill"),
        user: () => path7.join(configRoot(), "opencode/skill")
      },
      factory: {
        repo: (cwd) => path7.join(resolveRepoRoot(cwd), ".factory/skills"),
        user: () => path7.join(os.homedir(), ".factory/skills")
      },
      cursor: {
        repo: (cwd) => path7.join(resolveRepoRoot(cwd), ".cursor/skills")
      }
    };
  }
});

// node_modules/skillflag/dist/install/copy.js
import fs7 from "node:fs/promises";
import path8 from "node:path";
async function copySkillDir(sourceDir, destDir, force) {
  try {
    await fs7.access(destDir);
    if (!force) {
      throw new InstallError(`Destination already exists: ${destDir}`);
    }
    await fs7.rm(destDir, { recursive: true, force: true });
  } catch (err) {
    if (err instanceof InstallError)
      throw err;
  }
  await fs7.mkdir(path8.dirname(destDir), { recursive: true });
  await fs7.cp(sourceDir, destDir, { recursive: true });
}
var init_copy = __esm({
  "node_modules/skillflag/dist/install/copy.js"() {
    init_errors();
  }
});

// node_modules/skillflag/dist/install/install.js
import fs8 from "node:fs/promises";
import os2 from "node:os";
import path9 from "node:path";
async function installSkill(input, options) {
  const { agent, scope, cwd, force } = options;
  let rootDir = "";
  let cleanup = async () => {
  };
  if (input.kind === "dir") {
    rootDir = path9.resolve(input.dir);
  } else {
    const tempDir = await fs8.mkdtemp(path9.join(os2.tmpdir(), "skill-install-"));
    cleanup = async () => {
      await fs8.rm(tempDir, { recursive: true, force: true });
    };
    rootDir = await extractSkillTarToTemp(input.stream, tempDir);
  }
  try {
    await assertSkillDir(rootDir);
    const meta = await readSkillMetadata(rootDir);
    const skillId = meta.name;
    const skillsRoot = resolveSkillsRoot2(agent, scope, cwd);
    const destDir = path9.join(skillsRoot, skillId);
    await copySkillDir(rootDir, destDir, force);
    return { skillId, installedTo: destDir };
  } finally {
    await cleanup();
  }
}
var init_install = __esm({
  "node_modules/skillflag/dist/install/install.js"() {
    init_validate();
    init_extract();
    init_resolve();
    init_copy();
  }
});

// node_modules/skillflag/dist/install/cli.js
var cli_exports = {};
__export(cli_exports, {
  runInstallCli: () => runInstallCli
});
import process2 from "node:process";
import fs9 from "node:fs";
import path10 from "node:path";
import { ReadStream as TtyReadStream, WriteStream as TtyWriteStream } from "node:tty";
import { Readable } from "node:stream";
function parseScopeValue(value) {
  if (!value || value.startsWith("-")) {
    throw new InstallError("Missing value for --scope.");
  }
  const scope = value.trim();
  if (scope.length === 0) {
    throw new InstallError("Missing value for --scope.");
  }
  if (scope.includes(",")) {
    throw new InstallError("Only one value is allowed for --scope. Comma-separated values are not supported.");
  }
  return scope;
}
function parseAgentValue(value) {
  if (!value || value.startsWith("-")) {
    throw new InstallError("Missing value for --agent.");
  }
  const agent = value.trim();
  if (agent.length === 0) {
    throw new InstallError("Missing value for --agent.");
  }
  if (agent.includes(",")) {
    throw new InstallError("Only one value is allowed for --agent. Comma-separated values are not supported.");
  }
  return agent;
}
function parseArgs(args) {
  const rest = [...args];
  const inputPaths = [];
  let agentValue;
  let scopeValue;
  let force = false;
  let help = false;
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--agent") {
      if (agentValue !== void 0) {
        throw new InstallError("Only one --agent flag is allowed.");
      }
      agentValue = parseAgentValue(rest[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--scope") {
      if (scopeValue !== void 0) {
        throw new InstallError("Only one --scope flag is allowed.");
      }
      scopeValue = parseScopeValue(rest[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new InstallError(`Unknown option: ${arg}`);
    }
    inputPaths.push(arg);
  }
  return {
    inputPaths,
    agents: agentValue ? [agentValue] : [],
    scopes: scopeValue ? [scopeValue] : [],
    force,
    help
  };
}
function stdinHasData(stream) {
  if (typeof stream.isTTY === "boolean") {
    return !stream.isTTY;
  }
  return !stream.readableEnded;
}
function stdinIsTty(stream) {
  return stream.isTTY === true;
}
function stdinIsPipe(stream) {
  const tty = stream.isTTY;
  if (tty === false) {
    return true;
  }
  if (tty === true) {
    return false;
  }
  return stream.fd === 0;
}
function openPromptTty() {
  let inputFd;
  let outputFd;
  try {
    inputFd = fs9.openSync("/dev/tty", "r");
    outputFd = fs9.openSync("/dev/tty", "w");
    const promptInputFd = inputFd;
    const promptOutputFd = outputFd;
    const input = new TtyReadStream(promptInputFd);
    const output = new TtyWriteStream(promptOutputFd);
    let closed = false;
    return {
      input,
      output,
      close: () => {
        if (closed) {
          return;
        }
        closed = true;
        input.destroy();
        output.destroy();
        try {
          fs9.closeSync(promptInputFd);
        } catch {
        }
        try {
          fs9.closeSync(promptOutputFd);
        } catch {
        }
      }
    };
  } catch {
    if (inputFd !== void 0) {
      try {
        fs9.closeSync(inputFd);
      } catch {
      }
    }
    if (outputFd !== void 0) {
      try {
        fs9.closeSync(outputFd);
      } catch {
      }
    }
    return null;
  }
}
function asAgent(value) {
  if (!value)
    return void 0;
  try {
    return assertAgent(value);
  } catch {
    return void 0;
  }
}
function asAgents(values) {
  return uniqueValues(values.map((value) => asAgent(value)).filter((value) => value !== void 0));
}
function asScope(value) {
  if (!value)
    return void 0;
  try {
    return assertScope(value);
  } catch {
    return void 0;
  }
}
function asScopes(values) {
  return uniqueValues(values.map((value) => asScope(value)).filter((value) => value !== void 0));
}
function validateRequiredFlags(parsed) {
  if (parsed.agents.length === 0 || parsed.scopes.length === 0) {
    throw new InstallError(`Missing required flags.
${usageText}`);
  }
  const agents = uniqueValues(parsed.agents.map((agent) => assertAgent(agent)));
  const scopes = uniqueValues(parsed.scopes.map((scope) => assertScope(scope)));
  assertSupportedAgentScopes(agents, scopes);
  return {
    inputPaths: parsed.inputPaths,
    agents,
    scopes,
    force: parsed.force
  };
}
function normalizeProvidedInputs(opts) {
  if (opts.providedInput && opts.providedInputs?.length) {
    throw new InstallError("providedInput and providedInputs cannot be used together.");
  }
  if (opts.providedSkillId && opts.providedSkillIds?.length) {
    throw new InstallError("providedSkillId and providedSkillIds cannot be used together.");
  }
  const inputs = opts.providedInputs ?? (opts.providedInput ? [opts.providedInput] : []);
  const skillIds = opts.providedSkillIds ?? (opts.providedSkillId ? [opts.providedSkillId] : []);
  if (skillIds.length > 0 && inputs.length === 0) {
    throw new InstallError("Preset skill ids require preset install inputs.");
  }
  if (skillIds.length > 0 && skillIds.length !== inputs.length) {
    throw new InstallError("Preset skill id count must match preset install input count.");
  }
  return { inputs, skillIds };
}
function parsePathList(value) {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return [];
  }
  return uniqueValues(raw.split(",").map((item) => item.trim()).filter((item) => item.length > 0));
}
function validatePathPrompt(value) {
  const candidates = parsePathList(value);
  if (candidates.length === 0)
    return "PATH is required.";
  for (const candidate of candidates) {
    try {
      const stat = fs9.statSync(candidate);
      if (!stat.isDirectory()) {
        return `PATH must be a directory: ${candidate}`;
      }
    } catch {
      return `PATH does not exist: ${candidate}`;
    }
  }
  return void 0;
}
function cancelWizard(promptInput, promptOutput, promptApi, message = "Install cancelled.") {
  promptApi.outro(message, { input: promptInput, output: promptOutput });
  return null;
}
async function streamToBuffer(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    stream.on("error", reject);
  });
}
async function prepareInstallSource(input, skillId) {
  if (input.kind === "dir") {
    const sourceDir = path10.resolve(input.dir);
    let stat;
    try {
      stat = fs9.statSync(sourceDir);
    } catch {
      throw new InstallError(`PATH does not exist: ${sourceDir}`);
    }
    if (!stat.isDirectory()) {
      throw new InstallError("PATH must be a directory containing SKILL.md.");
    }
    await assertSkillDir(sourceDir);
    const meta = await readSkillMetadata(sourceDir);
    return {
      source: sourceDir,
      skillIdHint: meta.name,
      makeInput: () => ({ kind: "dir", dir: sourceDir })
    };
  }
  const tarBuffer = await streamToBuffer(input.stream);
  return {
    source: "tar stream",
    skillIdHint: skillId ?? "<from skill bundle>",
    makeInput: () => ({ kind: "tar", stream: Readable.from(tarBuffer) })
  };
}
async function resolveInstallSources(inputPaths, stdin, provided) {
  if (inputPaths.length > 0 && provided.inputs.length > 0) {
    throw new InstallError("PATH cannot be used when install input is preset.");
  }
  if (inputPaths.length > 0) {
    return Promise.all(inputPaths.map((inputPath) => prepareInstallSource({ kind: "dir", dir: inputPath })));
  }
  if (provided.inputs.length > 0) {
    return Promise.all(provided.inputs.map((input, index) => prepareInstallSource(input, provided.skillIds[index])));
  }
  if (stdinHasData(stdin)) {
    return [await prepareInstallSource({ kind: "tar", stream: stdin })];
  }
  throw new InstallError(`Missing PATH or tar stream on stdin.
${usageText}`);
}
function buildInstallPlan(sources, agents, scopes, cwd) {
  const plan = [];
  for (const source of sources) {
    for (const agent of agents) {
      for (const scope of scopes) {
        const skillsRoot = resolveSkillsRoot2(agent, scope, cwd);
        plan.push({
          source,
          agent,
          scope,
          destination: path10.join(skillsRoot, source.skillIdHint)
        });
      }
    }
  }
  return plan;
}
function assertNoInstallCollisions(plan) {
  const plansByDestination = /* @__PURE__ */ new Map();
  for (const item of plan) {
    const entries = plansByDestination.get(item.destination) ?? [];
    entries.push(item);
    plansByDestination.set(item.destination, entries);
  }
  const collisions = [...plansByDestination.entries()].filter(([, items]) => items.length > 1).sort(([a], [b2]) => a.localeCompare(b2));
  if (collisions.length === 0) {
    return;
  }
  const lines = ["Install destination collisions detected:"];
  for (const [destination, items] of collisions) {
    lines.push(`- ${destination}`);
    for (const item of items) {
      lines.push(`  - ${item.source.skillIdHint} @ ${item.agent}/${item.scope} (source: ${item.source.source})`);
    }
  }
  lines.push("Resolve collisions by changing skill IDs, sources, --agent, or --scope so each combination has a unique destination.");
  throw new InstallError(lines.join("\n"));
}
async function runInstallWizard(parsed, stdin, promptInput, promptOutput, cwd, provided, promptApi) {
  promptApi.intro("skill-install wizard", {
    input: promptInput,
    output: promptOutput
  });
  let inputPaths = parsed.inputPaths;
  if (provided.inputs.length === 0 && inputPaths.length === 0 && !stdinHasData(stdin)) {
    const defaultPath = cwd;
    const pathValue = await promptApi.text({
      message: "PATH to skill directory (comma-separated for multiple, defaults to current directory)",
      placeholder: defaultPath,
      defaultValue: defaultPath,
      validate: validatePathPrompt,
      input: promptInput,
      output: promptOutput
    });
    if (promptApi.isCancel(pathValue)) {
      return cancelWizard(promptInput, promptOutput, promptApi);
    }
    inputPaths = parsePathList(pathValue.trim() || defaultPath);
  }
  const parsedAgents = asAgents(parsed.agents);
  let agents;
  if (parsedAgents.length > 0 && parsedAgents.length === uniqueValues(parsed.agents).length) {
    agents = parsedAgents;
  } else if (agentOptions.length === 1) {
    agents = [assertAgent(agentOptions[0].value)];
  } else {
    const agentValues = await promptApi.multiselect({
      message: "Agent targets",
      options: agentOptions,
      initialValues: parsedAgents.length > 0 ? parsedAgents : [],
      required: true,
      input: promptInput,
      output: promptOutput
    });
    if (promptApi.isCancel(agentValues)) {
      return cancelWizard(promptInput, promptOutput, promptApi);
    }
    agents = uniqueValues(agentValues.map((value) => assertAgent(value)));
  }
  const supportedScopes = sharedScopesForAgents(agents);
  if (supportedScopes.length === 0) {
    throw new InstallError(`No shared scopes for selected agents: ${agents.join(", ")}`);
  }
  const parsedScopes = asScopes(parsed.scopes).filter((scope) => supportedScopes.includes(scope));
  let scopes;
  if (supportedScopes.length === 1) {
    scopes = [supportedScopes[0]];
  } else {
    const scopeOptions = supportedScopes.map((scope) => ({
      value: scope,
      label: scope,
      hint: scopeDescriptions[scope]
    }));
    const scopeValues = await promptApi.multiselect({
      message: "Scope targets",
      options: scopeOptions,
      initialValues: parsedScopes.length > 0 ? parsedScopes : [],
      required: true,
      input: promptInput,
      output: promptOutput
    });
    if (promptApi.isCancel(scopeValues)) {
      return cancelWizard(promptInput, promptOutput, promptApi);
    }
    scopes = uniqueValues(scopeValues.map((scope) => assertScope(scope)));
  }
  const forceValue = await promptApi.confirm({
    message: "Force overwrite if the destination already exists? (--force)",
    initialValue: parsed.force,
    input: promptInput,
    output: promptOutput
  });
  if (promptApi.isCancel(forceValue)) {
    return cancelWizard(promptInput, promptOutput, promptApi);
  }
  const force = forceValue;
  assertSupportedAgentScopes(agents, scopes);
  const sources = await resolveInstallSources(inputPaths, stdin, provided);
  const plan = buildInstallPlan(sources, agents, scopes, cwd);
  assertNoInstallCollisions(plan);
  const sourceLines = sources.map((source) => `${source.skillIdHint} <= ${source.source}`);
  const installLines = plan.map((item) => `${item.source.skillIdHint} @ ${item.agent}/${item.scope} -> ${item.destination}`);
  promptApi.note([
    `Sources (${sources.length}):`,
    ...sourceLines,
    `Agents (${agents.length}): ${agents.join(", ")}`,
    `Scopes (${scopes.length}): ${scopes.join(", ")}`,
    `Matrix: ${sources.length} skill(s) \xD7 ${agents.length} agent(s) \xD7 ${scopes.length} scope(s) = ${plan.length} combination(s)`,
    `Execution targets: ${plan.length}`,
    `Planned combinations (${plan.length}):`,
    ...installLines,
    `Force: ${force ? "yes" : "no"}`
  ].join("\n"), "Install summary", { input: promptInput, output: promptOutput });
  const confirmed = await promptApi.confirm({
    message: "Proceed with install?",
    initialValue: true,
    input: promptInput,
    output: promptOutput
  });
  if (promptApi.isCancel(confirmed) || !confirmed) {
    return cancelWizard(promptInput, promptOutput, promptApi);
  }
  return {
    args: { inputPaths, agents, scopes, force },
    sources
  };
}
async function runInstall(args, sources, promptInput, promptOutput, cwd, useSpinner, promptApi) {
  const plan = buildInstallPlan(sources, args.agents, args.scopes, cwd);
  assertNoInstallCollisions(plan);
  const execute = async () => {
    const results = [];
    for (const item of plan) {
      const result = await installSkill(item.source.makeInput(), {
        agent: item.agent,
        scope: item.scope,
        cwd,
        force: args.force
      });
      results.push({ ...result, agent: item.agent, scope: item.scope });
    }
    return results;
  };
  if (!useSpinner) {
    return execute();
  }
  const s = promptApi.spinner({ input: promptInput, output: promptOutput });
  s.start(`Installing ${plan.length} target${plan.length === 1 ? "" : "s"}...`);
  try {
    const result = await execute();
    s.stop("Install complete.");
    return result;
  } catch (err) {
    s.error("Install failed.");
    throw err;
  }
}
async function drainStream(stream) {
  try {
    for await (const chunk of stream) {
      void chunk;
    }
  } catch {
  }
}
async function runInstallCli(argv, opts = {}) {
  const stdout = opts.stdout ?? process2.stdout;
  const stderr = opts.stderr ?? process2.stderr;
  const stdin = opts.stdin ?? process2.stdin;
  const cwd = opts.cwd ?? process2.cwd();
  const promptApi = opts.promptApi ?? defaultPromptApi;
  const openPromptTtyFn = opts.openPromptTty ?? openPromptTty;
  let promptInput = stdin;
  let promptOutput = stdout;
  let closePromptTty = null;
  try {
    const parsed = parseArgs(argv.slice(2));
    if (parsed.help) {
      stdout.write(`${usageText}
`);
      if (stdinIsPipe(stdin)) {
        await drainStream(stdin);
      }
      return 0;
    }
    let provided = normalizeProvidedInputs(opts);
    if (provided.inputs.length > 0 && parsed.inputPaths.length > 0) {
      throw new InstallError("PATH cannot be used when install input is preset.");
    }
    let wizardUsed = false;
    let resolvedArgs;
    let sources;
    if (parsed.agents.length === 0 || parsed.scopes.length === 0) {
      if (stdinIsTty(stdin)) {
        wizardUsed = true;
      } else if (stdinIsPipe(stdin) && stdinHasData(stdin)) {
        const promptTty = openPromptTtyFn();
        if (promptTty) {
          wizardUsed = true;
          promptInput = promptTty.input;
          promptOutput = promptTty.output;
          closePromptTty = promptTty.close;
        }
      }
      if (!wizardUsed) {
        resolvedArgs = validateRequiredFlags(parsed);
        sources = await resolveInstallSources(resolvedArgs.inputPaths, stdin, provided);
      } else {
        if (stdinIsPipe(stdin) && stdinHasData(stdin) && parsed.inputPaths.length === 0 && provided.inputs.length === 0) {
          const stdinTarBuffer = await streamToBuffer(stdin);
          provided = {
            inputs: [{ kind: "tar", stream: Readable.from(stdinTarBuffer) }],
            skillIds: []
          };
        }
        const wizardResult = await runInstallWizard(parsed, stdin, promptInput, promptOutput, cwd, provided, promptApi);
        if (!wizardResult) {
          if (stdinIsPipe(stdin)) {
            await drainStream(stdin);
          }
          return 1;
        }
        resolvedArgs = wizardResult.args;
        sources = wizardResult.sources;
      }
    } else {
      resolvedArgs = validateRequiredFlags(parsed);
      sources = await resolveInstallSources(resolvedArgs.inputPaths, stdin, provided);
    }
    const results = await runInstall(resolvedArgs, sources, promptInput, promptOutput, cwd, wizardUsed, promptApi);
    for (const result of results) {
      stderr.write(`Installed ${result.skillId} to ${result.installedTo} (${result.agent}/${result.scope})
`);
    }
    if (wizardUsed) {
      promptApi.outro("Done.", { input: promptInput, output: promptOutput });
    }
    return 0;
  } catch (err) {
    if (stdinIsPipe(stdin)) {
      await drainStream(stdin);
    }
    stderr.write(`${toErrorMessage2(err)}
`);
    return err instanceof InstallError ? err.exitCode : 1;
  } finally {
    closePromptTty?.();
  }
}
var agentList, scopeList, usageLines, usageText, defaultPromptApi, agentHints, agentOptions, scopeDescriptions;
var init_cli = __esm({
  "node_modules/skillflag/dist/install/cli.js"() {
    init_dist4();
    init_errors();
    init_install();
    init_resolve();
    init_validate();
    init_collections();
    agentList = AGENTS.join(", ");
    scopeList = SCOPES.join(", ");
    usageLines = [
      "Usage:",
      "  skill-install [PATH ...] [--agent <agent>] [--scope <scope>] [--force]",
      "",
      "Input:",
      "  PATH ...            Skill directory path(s) containing SKILL.md.",
      "  stdin tar stream    If PATH is omitted, reads a tar bundle from stdin.",
      "",
      "Options:",
      "  --agent <value>     Target agent (single value).",
      `                      Supported agents: ${agentList}`,
      "  --scope <value>     Target scope (single value).",
      `                      Supported scopes: ${scopeList}`,
      "  --force             Overwrite destination if it already exists.",
      "  -h, --help          Show this help.",
      "",
      "Behavior:",
      "  If --agent or --scope is missing and an interactive TTY is available,",
      "  the installer launches a wizard to collect missing values.",
      "  CLI flags accept only one --agent and one --scope.",
      "  Use the wizard to select multiple agents/scopes."
    ];
    usageText = usageLines.join("\n");
    defaultPromptApi = {
      confirm: ue,
      intro: ge,
      isCancel: q,
      multiselect: ve,
      note: Se,
      outro: ye,
      spinner: ft,
      text: Pe
    };
    agentHints = {
      codex: "OpenAI Codex CLI skills (.codex/skills or CODEX_HOME/skills)",
      claude: "Claude Code skills (.claude/skills)",
      portable: "Portable agents skills (.agents/skills)",
      vscode: "VS Code skills in .github/skills",
      copilot: "GitHub Copilot skills in .github/skills",
      amp: "Amp agent skills (.agents/skills)",
      goose: "Goose agent skills (.agents/skills)",
      opencode: "OpenCode skills (.opencode/skill)",
      factory: "Factory skills (.factory/skills)",
      cursor: "Cursor skills (.cursor/skills)"
    };
    agentOptions = AGENTS.map((agent) => ({
      value: agent,
      label: agent,
      hint: agentHints[agent]
    }));
    scopeDescriptions = {
      repo: "Install to the current git repo root.",
      user: "Install to your user-level skills directory.",
      cwd: "Install relative to the current working directory."
    };
  }
});

// src/mlclaw/cli.ts
import fs16 from "node:fs/promises";
import { realpathSync } from "node:fs";
import os8 from "node:os";
import process4 from "node:process";
import { createHash as createHash3, randomBytes, randomUUID as randomUUID2 } from "node:crypto";
import { pathToFileURL as pathToFileURL2 } from "node:url";
import { setTimeout as delay2 } from "node:timers/promises";

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

// src/mlclaw/cli.ts
init_dist4();

// node_modules/skillflag/dist/skillflag.js
import process3 from "node:process";

// node_modules/skillflag/dist/core/errors.js
var SkillflagError = class extends Error {
  exitCode;
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
};
function toErrorMessage(err) {
  if (err instanceof Error)
    return err.message;
  return String(err);
}

// node_modules/skillflag/dist/core/tar.js
var tar = __toESM(require_tar_stream(), 1);
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
var FIXED_MTIME = /* @__PURE__ */ new Date(0);
function isInvalidRelPath(relPosix) {
  if (path.posix.isAbsolute(relPosix))
    return true;
  const parts = relPosix.split("/");
  return parts.includes("..");
}
async function collectEntriesForDir(rootDir, relPosix, id, dirs, files) {
  dirs.add(relPosix);
  const absDir = relPosix ? path.join(rootDir, ...relPosix.split("/")) : rootDir;
  const dirents = await fsPromises.readdir(absDir, { withFileTypes: true });
  for (const dirent of dirents) {
    const name = dirent.name;
    const relChild = relPosix ? `${relPosix}/${name}` : name;
    if (isInvalidRelPath(relChild)) {
      throw new SkillflagError(`Invalid path in skill: ${id}/${relChild}`);
    }
    const absChild = path.join(absDir, name);
    if (dirent.isDirectory()) {
      await collectEntriesForDir(rootDir, relChild, id, dirs, files);
      continue;
    }
    if (dirent.isFile()) {
      const stat = await fsPromises.stat(absChild);
      files.push({
        name: `${id}/${relChild}`,
        type: "file",
        absPath: absChild,
        size: stat.size,
        mode: stat.mode & 511
      });
      continue;
    }
    if (dirent.isSymbolicLink()) {
      throw new SkillflagError(`Symlinks are not supported in skill bundles: ${id}/${relChild}`);
    }
    throw new SkillflagError(`Unsupported file type in skill bundle: ${id}/${relChild}`);
  }
}
async function collectSkillEntries(skillDir, id) {
  const dirs = /* @__PURE__ */ new Set();
  const files = [];
  await collectEntriesForDir(skillDir, "", id, dirs, files);
  const dirEntries = [];
  for (const relDir of dirs) {
    const absDir = relDir ? path.join(skillDir, ...relDir.split("/")) : skillDir;
    const stat = await fsPromises.stat(absDir);
    const dirName = relDir ? `${id}/${relDir}/` : `${id}/`;
    dirEntries.push({
      name: dirName,
      type: "directory",
      mode: stat.mode & 511
    });
  }
  const entries = [...dirEntries, ...files].sort((a, b2) => a.name.localeCompare(b2.name));
  return { entries, fileCount: files.length };
}
function writeDirEntry(pack2, entry) {
  return new Promise((resolve, reject) => {
    pack2.entry({
      name: entry.name,
      type: "directory",
      mode: entry.mode,
      mtime: FIXED_MTIME,
      uid: 0,
      gid: 0,
      uname: "",
      gname: ""
    }, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}
function writeFileEntry(pack2, entry) {
  if (!entry.absPath) {
    return Promise.reject(new Error(`Missing file path for ${entry.name}`));
  }
  if (entry.size === void 0) {
    return Promise.reject(new Error(`Missing file size for ${entry.name}`));
  }
  const absPath = entry.absPath;
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(absPath);
    const tarEntry = pack2.entry({
      name: entry.name,
      type: "file",
      mode: entry.mode,
      size: entry.size,
      mtime: FIXED_MTIME,
      uid: 0,
      gid: 0,
      uname: "",
      gname: ""
    }, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
    fileStream.on("error", reject);
    tarEntry.on("error", reject);
    fileStream.pipe(tarEntry);
  });
}
function createTarStream(entries) {
  const pack2 = tar.pack();
  void (async () => {
    try {
      for (const entry of entries) {
        if (entry.type === "directory") {
          await writeDirEntry(pack2, entry);
        } else {
          await writeFileEntry(pack2, entry);
        }
      }
      pack2.finalize();
    } catch (err) {
      pack2.destroy(err);
    }
  })();
  return pack2;
}

// node_modules/skillflag/dist/core/export.js
async function pipeToWritable(stream, dest) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    const onEnd = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      stream.removeListener("error", onError);
      stream.removeListener("end", onEnd);
      dest.removeListener("error", onError);
    };
    stream.on("error", onError);
    stream.on("end", onEnd);
    dest.on("error", onError);
    stream.pipe(dest, { end: false });
  });
}
async function exportSkill(skillDir, id, stdout) {
  const { entries } = await collectSkillEntries(skillDir, id);
  const tarStream = createTarStream(entries);
  await pipeToWritable(tarStream, stdout);
}

// node_modules/skillflag/dist/core/list.js
import fs3 from "node:fs/promises";
import path3 from "node:path";

// node_modules/skillflag/dist/core/digest.js
import { createHash } from "node:crypto";
import { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
async function digestStreamSha256(stream) {
  const hash3 = createHash("sha256");
  const sink = new Writable({
    write(chunk, _encoding, callback) {
      hash3.update(chunk);
      callback();
    }
  });
  await pipeline(stream, sink);
  return `sha256:${hash3.digest("hex")}`;
}

// node_modules/skillflag/dist/core/paths.js
import fs2 from "node:fs";
import fsPromises2 from "node:fs/promises";
import path2 from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
var PRODUCER_SKILLS_ROOTS = ["skills", path2.join(".agents", "skills")];
function defaultSkillsRoot() {
  const startDir = path2.dirname(fileURLToPath(import.meta.url));
  let current = startDir;
  while (true) {
    const candidate = path2.join(current, "package.json");
    if (fs2.existsSync(candidate)) {
      return pathToFileURL(path2.join(current, "skills/"));
    }
    const parent = path2.dirname(current);
    if (parent === current) {
      return pathToFileURL(path2.join(startDir, "../../skills/"));
    }
    current = parent;
  }
}
function resolveSkillsRoot(root) {
  if (root instanceof URL) {
    return path2.resolve(fileURLToPath(root));
  }
  if (root.startsWith("file:")) {
    return path2.resolve(fileURLToPath(new URL(root)));
  }
  return path2.resolve(root);
}
function resolveSkillsRoots(roots) {
  const inputs = Array.isArray(roots) ? roots : [roots];
  const seen = /* @__PURE__ */ new Set();
  const resolved = [];
  for (const input of inputs) {
    const root = resolveSkillsRoot(input);
    if (!seen.has(root)) {
      seen.add(root);
      resolved.push(root);
    }
  }
  return resolved;
}
function toPath(input) {
  if (input instanceof URL) {
    return fileURLToPath(input);
  }
  if (input.startsWith("file:")) {
    return fileURLToPath(new URL(input));
  }
  return input;
}
function existingProducerRoots(dir) {
  const roots = [];
  for (const rel of PRODUCER_SKILLS_ROOTS) {
    const candidate = path2.join(dir, rel);
    if (fs2.existsSync(candidate) && fs2.statSync(candidate).isDirectory()) {
      roots.push(pathToFileURL(candidate + path2.sep));
    }
  }
  return roots;
}
function findSkillsRoots(start) {
  let current = toPath(start);
  try {
    const stat = fs2.statSync(current);
    if (!stat.isDirectory()) {
      current = path2.dirname(current);
    }
  } catch {
    current = path2.dirname(current);
  }
  while (true) {
    const roots = existingProducerRoots(current);
    if (roots.length > 0) {
      return roots;
    }
    const parent = path2.dirname(current);
    if (parent === current) {
      throw new SkillflagError("Could not find a skills/ or .agents/skills/ directory. Pass skillsRoot explicitly.");
    }
    current = parent;
  }
}
function findSkillsRoot(start) {
  return findSkillsRoots(start)[0];
}
function assertValidSkillId(id) {
  if (!id || id === "." || id === "..") {
    throw new SkillflagError("Skill id is required.");
  }
  if (id.includes("/") || id.includes("\\")) {
    throw new SkillflagError(`Invalid skill id: ${id}`);
  }
}
async function pathExists(filePath) {
  try {
    await fsPromises2.access(filePath);
    return true;
  } catch {
    return false;
  }
}
async function listSkillDirs(rootDir) {
  let dirents = [];
  try {
    dirents = await fsPromises2.readdir(rootDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const skills = [];
  for (const dirent of dirents) {
    if (!dirent.isDirectory())
      continue;
    const id = dirent.name;
    const skillDir = path2.join(rootDir, id);
    const skillMd = path2.join(skillDir, "SKILL.md");
    if (await pathExists(skillMd)) {
      skills.push({ id, dir: skillDir });
    }
  }
  skills.sort((a, b2) => a.id.localeCompare(b2.id));
  return skills;
}
async function resolveSkillDirFromRoots(rootDirs, id) {
  assertValidSkillId(id);
  for (const rootDir of rootDirs) {
    const skillDir = path2.join(rootDir, id);
    const skillMd = path2.join(skillDir, "SKILL.md");
    if (await pathExists(skillMd)) {
      return skillDir;
    }
  }
  throw new SkillflagError(`Skill not found: ${id}`);
}

// node_modules/skillflag/dist/core/list.js
init_frontmatter();
async function readSkillInfo(dir, id) {
  const skillMdPath = path3.join(dir, "SKILL.md");
  try {
    const content = await fs3.readFile(skillMdPath, "utf8");
    const fields = parseFrontmatter(content);
    const summary = fields.description ? fields.description.replace(/[\t\n]/g, " ").trim() : void 0;
    return {
      id,
      dir,
      summary,
      version: fields.version
    };
  } catch {
    return { id, dir };
  }
}
async function listSkills(rootDirs) {
  const seen = /* @__PURE__ */ new Map();
  for (const rootDir of rootDirs) {
    const dirs = await listSkillDirs(rootDir);
    for (const skill of dirs) {
      if (!seen.has(skill.id)) {
        seen.set(skill.id, skill.dir);
      }
    }
  }
  const infos = [];
  for (const [id, dir] of seen.entries()) {
    infos.push(await readSkillInfo(dir, id));
  }
  infos.sort((a, b2) => a.id.localeCompare(b2.id));
  return infos;
}
async function listSkillsJson(rootDirs) {
  const skills = await listSkills(rootDirs);
  const results = [];
  for (const skill of skills) {
    const { entries, fileCount } = await collectSkillEntries(skill.dir, skill.id);
    const stream = createTarStream(entries);
    const digest = await digestStreamSha256(stream);
    const item = {
      id: skill.id,
      digest
    };
    if (fileCount > 0) {
      item.files = fileCount;
    }
    if (skill.summary) {
      item.summary = skill.summary;
    }
    if (skill.version) {
      item.version = skill.version;
    }
    results.push(item);
  }
  return {
    skillflag_version: "0.1",
    skills: results
  };
}

// node_modules/skillflag/dist/core/show.js
import fs4 from "node:fs/promises";
import path4 from "node:path";
async function showSkill(skillDir, _id, stdout) {
  const skillMdPath = path4.join(skillDir, "SKILL.md");
  const content = await fs4.readFile(skillMdPath, "utf8");
  stdout.write(content);
}

// node_modules/skillflag/dist/skillflag.js
init_collections();
var usageLines2 = [
  "Usage:",
  "  --skill install [<id> ...] [--agent <agent>] [--scope <scope>] [--force]",
  "  --skill list [--json]",
  "  --skill export <id>",
  "  --skill show <id>",
  "  --skill help"
];
var SKILLFLAG_HELP_TEXT = [
  "Skillflag help",
  "",
  "Install skillflag globally to get both binaries on your PATH:",
  "  npm install -g skillflag",
  "",
  "Prefer not to install globally? Use npx for one-off runs:",
  "  npx skillflag list",
  "  npx skillflag install --agent codex --scope repo < ./skill.tar",
  "",
  "List available skills:",
  "  tool --skill list",
  "  tool --skill list --json",
  "",
  "Show a skill's documentation:",
  "  tool --skill show <id>",
  "",
  "Export a skill bundle:",
  "  tool --skill export <id>",
  "",
  "Install a skill bundle:",
  "  tool --skill install [<id> ...] [--agent <agent>] [--scope <scope>]",
  "  tool --skill export <id> | skill-install --agent <agent> --scope <scope>",
  "",
  "For full details, read docs/SKILLFLAG_SPEC.md."
].join("\n");
async function defaultPromptApi2() {
  const prompts = await Promise.resolve().then(() => (init_dist4(), dist_exports));
  return {
    multiselect: prompts.multiselect,
    isCancel: prompts.isCancel
  };
}
function resolveSkillActionArgs(argv) {
  const cliArgs = argv.length > 2 ? argv.slice(2) : [...argv];
  const skillIndex = cliArgs.indexOf("--skill");
  if (skillIndex >= 0) {
    return cliArgs.slice(skillIndex + 1);
  }
  return cliArgs;
}
function parseInstallIds(values) {
  const ids = [];
  let index = 0;
  while (index < values.length) {
    const value = values[index];
    if (value.startsWith("-")) {
      break;
    }
    const parsed = value.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
    ids.push(...parsed);
    index += 1;
  }
  return {
    ids: ids.length > 0 ? uniqueValues(ids) : void 0,
    installArgs: values.slice(index)
  };
}
function parseSkillArgs(argv) {
  const args = resolveSkillActionArgs(argv);
  const action = args[0];
  if (!action || action.startsWith("-")) {
    throw new SkillflagError(`Missing --skill action.
${usageLines2.join("\n")}`);
  }
  if (action === "install") {
    const rest = args.slice(1);
    const parsed = parseInstallIds(rest);
    return {
      kind: "install",
      ids: parsed.ids,
      installArgs: parsed.installArgs
    };
  }
  if (action === "list") {
    const json = args.slice(1).includes("--json");
    return { kind: "list", json };
  }
  if (action === "help") {
    return { kind: "help" };
  }
  if (action === "export" || action === "show") {
    const id = args[1];
    if (!id || id.startsWith("-")) {
      throw new SkillflagError(`Missing skill id.
${usageLines2.join("\n")}`);
    }
    return { kind: action, id };
  }
  throw new SkillflagError(`Unknown --skill action: ${action}.
${usageLines2.join("\n")}`);
}
function stdinIsTty2(stream) {
  return stream.isTTY === true;
}
async function resolveInstallSkillIds(action, rootDirs, stdin, stdout, promptApi) {
  if (action.ids && action.ids.length > 0) {
    return action.ids;
  }
  const skills = await listSkills(rootDirs);
  if (skills.length === 0) {
    throw new SkillflagError("No skills are available to install.");
  }
  if (skills.length === 1) {
    return [skills[0].id];
  }
  if (!stdinIsTty2(stdin)) {
    throw new SkillflagError("Multiple skills are available; pass one or more ids with --skill install <id> [...].");
  }
  const options = skills.map((skill) => ({
    value: skill.id,
    label: skill.id,
    hint: skill.summary
  }));
  const selected = await promptApi.multiselect({
    message: "Select skills to install",
    options,
    required: true,
    input: stdin,
    output: stdout
  });
  if (promptApi.isCancel(selected)) {
    throw new SkillflagError("Install cancelled.");
  }
  return uniqueValues(selected);
}
async function runInstallAction(action, rootDirs, opts, stdin, stdout, stderr) {
  const promptApi = opts.promptApi ?? await defaultPromptApi2();
  const skillIds = await resolveInstallSkillIds(action, rootDirs, stdin, stdout, promptApi);
  const inputs = await Promise.all(skillIds.map(async (skillId) => {
    const skillDir = await resolveSkillDirFromRoots(rootDirs, skillId);
    const { entries } = await collectSkillEntries(skillDir, skillId);
    return { kind: "tar", stream: createTarStream(entries) };
  }));
  const { runInstallCli: runInstallCli2 } = await Promise.resolve().then(() => (init_cli(), cli_exports));
  return runInstallCli2(["node", "skill-install", ...action.installArgs], {
    stdin,
    stdout,
    stderr,
    cwd: opts.cwd,
    providedInputs: inputs,
    providedSkillIds: skillIds
  });
}
async function handleSkillflag(argv, opts) {
  const stdin = opts.stdin ?? process3.stdin;
  const stdout = opts.stdout ?? process3.stdout;
  const stderr = opts.stderr ?? process3.stderr;
  try {
    const action = parseSkillArgs(argv);
    const bundledRoot = resolveSkillsRoot(defaultSkillsRoot());
    const includeBundled = opts.includeBundledSkill !== false;
    const rootDirs = resolveSkillsRoots(includeBundled ? [...resolveSkillsRoots(opts.skillsRoot), bundledRoot] : opts.skillsRoot);
    if (action.kind === "install") {
      return await runInstallAction(action, rootDirs, opts, stdin, stdout, stderr);
    }
    if (action.kind === "list") {
      if (action.json) {
        const payload = await listSkillsJson(rootDirs);
        stdout.write(JSON.stringify(payload));
      } else {
        const skills = await listSkills(rootDirs);
        if (skills.length > 0) {
          const lines = skills.map((skill) => skill.summary ? `${skill.id}	${skill.summary}` : skill.id);
          stdout.write(`${lines.join("\n")}
`);
        }
      }
      return 0;
    }
    if (action.kind === "export") {
      const skillDir2 = await resolveSkillDirFromRoots(rootDirs, action.id);
      await exportSkill(skillDir2, action.id, stdout);
      return 0;
    }
    if (action.kind === "help") {
      stdout.write(`${SKILLFLAG_HELP_TEXT}
`);
      return 0;
    }
    const skillDir = await resolveSkillDirFromRoots(rootDirs, action.id);
    await showSkill(skillDir, action.id, stdout);
    return 0;
  } catch (err) {
    const message = toErrorMessage(err);
    stderr.write(`${message}
`);
    return err instanceof SkillflagError ? err.exitCode : 1;
  }
}

// src/mlclaw/auth.ts
import fs11 from "node:fs/promises";
import os4 from "node:os";
import path12 from "node:path";

// src/mlclaw/hf-cli.ts
import { spawn } from "node:child_process";
import fs10, { constants as fsConstants } from "node:fs/promises";
import os3 from "node:os";
import path11 from "node:path";
var HF_CLI_INSTALL_URL = "https://hf.co/cli/install.sh";
var HF_ACCOUNT_CREATE_URL = "https://huggingface.co/join";
var HF_CLI_INSTALL_COMMAND = `curl -LsSf ${HF_CLI_INSTALL_URL} | bash`;
function createSystemHfCli(env = process.env) {
  return {
    findExecutable: async () => await findHfExecutable(env),
    install: async () => await installHfCli(env),
    login: async (executable) => await runInherited(executable, ["auth", "login"], env),
    openUrl: async (url) => await openUrl(url, env)
  };
}
async function findHfExecutable(env) {
  const fromPath = await hfCommandPath(env);
  if (fromPath) {
    return fromPath;
  }
  const home = env.HOME || os3.homedir();
  const candidates = [
    env.HF_CLI_BIN_DIR && path11.join(env.HF_CLI_BIN_DIR, "hf"),
    path11.join(home, ".local", "bin", "hf")
  ].filter((candidate) => Boolean(candidate));
  for (const candidate of candidates) {
    try {
      await fs10.access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
    }
  }
  return void 0;
}
async function hfCommandPath(env) {
  return await new Promise((resolve) => {
    const child = spawn("sh", ["-c", "command -v hf"], {
      env,
      stdio: ["ignore", "pipe", "ignore"]
    });
    let output = "";
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", () => resolve(void 0));
    child.once("close", (code) => resolve(code === 0 ? output.trim() || void 0 : void 0));
  });
}
async function installHfCli(env) {
  if (process.platform !== "darwin" && process.platform !== "linux") {
    throw new Error(`automatic Hugging Face CLI installation is not supported on ${process.platform}`);
  }
  const response = await fetch(HF_CLI_INSTALL_URL, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`failed to download the Hugging Face CLI installer: HTTP ${response.status}`);
  }
  const temporaryDirectory = await fs10.mkdtemp(path11.join(os3.tmpdir(), "mlclaw-hf-cli-"));
  const installerPath = path11.join(temporaryDirectory, "install.sh");
  try {
    await fs10.writeFile(installerPath, await response.text(), { mode: 448 });
    await runInherited("bash", [installerPath], env);
  } finally {
    await fs10.rm(temporaryDirectory, { recursive: true, force: true });
  }
}
async function runInherited(command, args, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: "inherit" });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited ${signal ? `after signal ${signal}` : `with status ${code ?? "unknown"}`}`));
    });
  });
}
async function openUrl(url, env) {
  const command = process.platform === "darwin" ? "open" : process.platform === "linux" ? "xdg-open" : void 0;
  if (!command) {
    return false;
  }
  return await new Promise((resolve) => {
    const child = spawn(command, [url], { env, stdio: "ignore" });
    child.once("error", () => resolve(false));
    child.once("close", (code) => resolve(code === 0));
  });
}

// src/mlclaw/auth.ts
async function readToken(env = process.env) {
  const fromEnv = env.HF_TOKEN?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const candidates = [
    env.HF_TOKEN_PATH,
    env.HF_HOME && path12.join(env.HF_HOME, "token"),
    path12.join(os4.homedir(), ".cache", "huggingface", "token"),
    path12.join(os4.homedir(), ".huggingface", "token")
  ].filter((value) => Boolean(value));
  for (const candidate of candidates) {
    try {
      const token = (await fs11.readFile(candidate, "utf8")).trim();
      if (token) {
        return token;
      }
    } catch {
    }
  }
  throw new Error("HF token not found. Set HF_TOKEN or run `hf auth login` once.");
}
async function ensureHfToken(params) {
  let missingTokenError;
  try {
    return await params.readToken();
  } catch (error) {
    missingTokenError = error;
  }
  if (!params.prompt.isInteractive()) {
    throw missingTokenError;
  }
  let executable = await params.hfCli.findExecutable();
  if (!executable) {
    params.prompt.note(
      `ML Claw uses the official Hugging Face CLI to sign you in.

Manual install command:
${HF_CLI_INSTALL_COMMAND}`,
      "Hugging Face CLI required"
    );
    const install = await params.prompt.confirm("Install the Hugging Face CLI now?", true);
    if (!install) {
      throw new Error(`Hugging Face CLI installation was declined. Install it with: ${HF_CLI_INSTALL_COMMAND}`);
    }
    await params.hfCli.install();
    executable = await params.hfCli.findExecutable();
    if (!executable) {
      throw new Error(
        `Hugging Face CLI was installed but could not be found. Open a new terminal or run: ${HF_CLI_INSTALL_COMMAND}`
      );
    }
  }
  const hasAccount = await params.prompt.confirm("Do you already have a Hugging Face account?", true);
  if (!hasAccount) {
    const opened = await params.hfCli.openUrl(HF_ACCOUNT_CREATE_URL);
    params.prompt.note(
      `${opened ? "A browser was opened for account creation." : "Create your account in a browser."}

${HF_ACCOUNT_CREATE_URL}`,
      "Create a Hugging Face account"
    );
    const accountCreated = await params.prompt.confirm("Have you created your Hugging Face account?", false);
    if (!accountCreated) {
      throw new Error(`Create a Hugging Face account at ${HF_ACCOUNT_CREATE_URL}, then run ML Claw again`);
    }
  }
  params.prompt.note(
    "Complete Hugging Face sign-in in the browser. ML Claw will resume automatically afterward.",
    "Hugging Face sign-in"
  );
  await params.hfCli.login(executable);
  try {
    return await params.readToken();
  } catch {
    throw new Error("Hugging Face sign-in completed, but no local token was found. Run `hf auth login` and try again.");
  }
}

// src/mlclaw/docker.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
var DOCKER_STOP_GRACE_SECONDS = 300;
var CliDockerRunner = class {
  engine = "docker";
  async probe(context) {
    try {
      const selected = context?.trim() || await this.currentContext();
      if (!selected || !await this.contextExists(selected)) {
        return unavailableProbe(this.engine, `Docker context ${selected || "<unknown>"} is not available`, selected);
      }
      await docker(withContext(selected, ["version", "--format", "{{.Server.Version}}"]), PROBE_TIMEOUT_MS);
      return {
        engine: this.engine,
        status: "ready",
        context: selected,
        ...await this.contextEndpoint(selected).then((endpoint) => endpoint ? { endpoint } : {}),
        detail: `Docker context ${selected} is ready`
      };
    } catch (err) {
      return classifyContainerProbeError(this.engine, err, context);
    }
  }
  async currentContext() {
    const { stdout } = await docker(["context", "show"]);
    return stdout.trim();
  }
  async contextExists(context) {
    try {
      await docker(["context", "inspect", context]);
      return true;
    } catch {
      return false;
    }
  }
  async contextEndpoint(context) {
    try {
      const { stdout } = await docker(["context", "inspect", context, "--format", "{{json .Endpoints.docker.Host}}"]);
      const trimmed = stdout.trim();
      if (!trimmed || trimmed === "null") {
        return void 0;
      }
      return JSON.parse(trimmed);
    } catch {
      return void 0;
    }
  }
  async pull(image, context) {
    await docker(withContext(context, ["pull", image]));
  }
  async run(params) {
    const ports = renderPublishedPorts(params.publishedPorts);
    await docker(
      withContext(params.context, [
        "run",
        "-d",
        "--name",
        params.containerName,
        "--restart",
        "unless-stopped",
        "--env-file",
        params.envFile,
        "-e",
        `OPENCLAW_LIVE_DIR=${params.liveDir}`,
        ...ports,
        "-v",
        `${params.volumeName}:${params.volumeMountPath}`,
        params.image
      ])
    );
  }
  async start(containerName, context) {
    await docker(withContext(context, ["start", containerName]));
  }
  async stop(containerName, context) {
    await docker(withContext(context, ["stop", "--time", String(DOCKER_STOP_GRACE_SECONDS), containerName]));
  }
  async rm(containerName, context) {
    await docker(withContext(context, ["rm", containerName]));
  }
  async rmVolume(volumeName, context) {
    try {
      await docker(withContext(context, ["volume", "rm", volumeName]));
    } catch (err) {
      if (isMissingVolumeError(err)) {
        return;
      }
      throw err;
    }
  }
  async disableRestart(containerName, context) {
    await docker(withContext(context, ["update", "--restart", "no", containerName]));
  }
  async logs(containerName, tail = 200, context) {
    const { stdout, stderr } = await docker(withContext(context, ["logs", "--tail", String(tail), containerName]));
    return mergeDockerLogStreams(stdout, stderr);
  }
  async inspect(containerName, context) {
    try {
      const { stdout } = await docker(
        withContext(context, [
          "inspect",
          containerName,
          "--format",
          "{{.State.Running}}	{{.State.Status}}	{{.Config.Image}}"
        ])
      );
      const [running, status, image] = stdout.trim().split("	");
      return {
        exists: true,
        running: running === "true",
        ...status ? { status } : {},
        ...image ? { image } : {}
      };
    } catch (err) {
      if (isMissingContainerError(err)) {
        return null;
      }
      throw err;
    }
  }
};
var CliPodmanRunner = class {
  engine = "podman";
  async probe(context) {
    try {
      const selected = context?.trim() || await this.currentContext();
      await podman(withPodmanConnection(selected, ["info", "--format", "json"]), PROBE_TIMEOUT_MS);
      return {
        engine: this.engine,
        status: "ready",
        context: selected,
        ...await this.contextEndpoint(selected).then((endpoint) => endpoint ? { endpoint } : {}),
        detail: selected === LOCAL_PODMAN_CONNECTION ? "Podman default connection is ready" : `Podman connection ${selected} is ready`
      };
    } catch (err) {
      return classifyContainerProbeError(this.engine, err, context?.trim());
    }
  }
  async currentContext() {
    try {
      const { stdout } = await podman(["system", "connection", "list", "--format", "json"], PROBE_TIMEOUT_MS);
      return parsePodmanConnections(stdout).find((connection) => connection.isDefault)?.name ?? LOCAL_PODMAN_CONNECTION;
    } catch {
      return LOCAL_PODMAN_CONNECTION;
    }
  }
  async contextExists(context) {
    return (await this.probe(context)).status === "ready";
  }
  async contextEndpoint(context) {
    if (normalizePodmanConnection(context) === LOCAL_PODMAN_CONNECTION) {
      return void 0;
    }
    try {
      const { stdout } = await podman(["system", "connection", "list", "--format", "json"]);
      return parsePodmanConnections(stdout).find((connection) => connection.name === context)?.uri;
    } catch {
      return void 0;
    }
  }
  async pull(image, context) {
    await podman(withPodmanConnection(context, ["pull", image]));
  }
  async run(params) {
    const ports = renderPublishedPorts(params.publishedPorts);
    await podman(
      withPodmanConnection(params.context, [
        "run",
        "-d",
        "--name",
        params.containerName,
        "--restart",
        "unless-stopped",
        "--env-file",
        params.envFile,
        "-e",
        `OPENCLAW_LIVE_DIR=${params.liveDir}`,
        ...ports,
        "-v",
        `${params.volumeName}:${params.volumeMountPath}`,
        params.image
      ])
    );
  }
  async start(containerName, context) {
    await podman(withPodmanConnection(context, ["start", containerName]));
  }
  async stop(containerName, context) {
    await podman(withPodmanConnection(context, ["stop", "--time", String(DOCKER_STOP_GRACE_SECONDS), containerName]));
  }
  async rm(containerName, context) {
    await podman(withPodmanConnection(context, ["rm", containerName]));
  }
  async rmVolume(volumeName, context) {
    try {
      await podman(withPodmanConnection(context, ["volume", "rm", volumeName]));
    } catch (err) {
      if (!isMissingVolumeError(err)) {
        throw err;
      }
    }
  }
  async disableRestart(containerName, context) {
    await podman(withPodmanConnection(context, ["update", "--restart", "no", containerName]));
  }
  async logs(containerName, tail = 200, context) {
    const { stdout, stderr } = await podman(
      withPodmanConnection(context, ["logs", "--tail", String(tail), containerName])
    );
    return mergeDockerLogStreams(stdout, stderr);
  }
  async inspect(containerName, context) {
    try {
      const { stdout } = await podman(
        withPodmanConnection(context, [
          "inspect",
          containerName,
          "--format",
          "{{.State.Running}}	{{.State.Status}}	{{.Config.Image}}"
        ])
      );
      const [running, status, image] = stdout.trim().split("	");
      return {
        exists: true,
        running: running === "true",
        ...status ? { status } : {},
        ...image ? { image } : {}
      };
    } catch (err) {
      if (isMissingContainerError(err)) {
        return null;
      }
      throw err;
    }
  }
};
function renderPublishedPorts(ports) {
  if (ports.length === 0) throw new Error("at least one published port is required");
  const seen = /* @__PURE__ */ new Set();
  return ports.flatMap((port) => {
    if (port.hostAddress === "0.0.0.0" || port.hostAddress === "::") {
      throw new Error("wildcard container port publishing is not allowed");
    }
    const key = `${port.hostAddress}:${port.hostPort}:${port.containerPort}`;
    if (seen.has(key)) throw new Error(`duplicate published port: ${key}`);
    seen.add(key);
    return ["-p", key];
  });
}
function containerNameFor(agent) {
  return `mlclaw-${agent}`;
}
function volumeNameFor(agent) {
  return `mlclaw-${agent}-live`;
}
function mergeDockerLogStreams(stdout, stderr) {
  return `${stdout}${stderr}`;
}
function withContext(context, args) {
  return context ? ["--context", context, ...args] : args;
}
function withPodmanConnection(context, args) {
  const selected = normalizePodmanConnection(context);
  return selected === LOCAL_PODMAN_CONNECTION ? args : ["--connection", selected, ...args];
}
function classifyContainerProbeError(engine, err, context) {
  const message = dockerErrorMessage(err);
  if (isCommandMissing(err)) {
    return { engine, status: "missing", detail: `${displayEngine(engine)} is not installed` };
  }
  if (message.includes("permission denied") || message.includes("access is denied")) {
    return unavailableProbe(
      engine,
      `${displayEngine(engine)} is installed but permission was denied`,
      context,
      "permission-denied"
    );
  }
  return unavailableProbe(engine, `${displayEngine(engine)} is installed but its engine is unavailable`, context);
}
function parsePodmanConnections(raw) {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.flatMap((value) => {
    if (!value || typeof value !== "object") {
      return [];
    }
    const record2 = value;
    const name = record2.Name ?? record2.name;
    const uri = record2.URI ?? record2.uri;
    const isDefault = record2.Default ?? record2.default;
    if (typeof name !== "string" || !name.trim()) {
      return [];
    }
    return [
      {
        name: name.trim(),
        ...typeof uri === "string" && uri.trim() ? { uri: uri.trim() } : {},
        isDefault: isDefault === true
      }
    ];
  });
}
var PROBE_TIMEOUT_MS = 5e3;
var LOCAL_PODMAN_CONNECTION = "local";
async function docker(args, timeout) {
  return await containerCommand("docker", args, timeout);
}
async function podman(args, timeout) {
  return await containerCommand("podman", args, timeout);
}
async function containerCommand(command, args, timeout) {
  try {
    return await execFileAsync(command, args, { encoding: "utf8", ...timeout ? { timeout } : {} });
  } catch (err) {
    if (err instanceof Error && "stderr" in err && typeof err.stderr === "string") {
      err.message = `${err.message}
${err.stderr}`;
    }
    throw err;
  }
}
function unavailableProbe(engine, detail, context, status = "unavailable") {
  return { engine, status, ...context ? { context } : {}, detail };
}
function normalizePodmanConnection(context) {
  return context?.trim() || LOCAL_PODMAN_CONNECTION;
}
function displayEngine(engine) {
  return engine === "docker" ? "Docker" : "Podman";
}
function isCommandMissing(err) {
  return Boolean(err && typeof err === "object" && "code" in err && err.code === "ENOENT");
}
function isMissingContainerError(err) {
  const message = dockerErrorMessage(err);
  return message.includes("no such object") || message.includes("no such container");
}
function isMissingVolumeError(err) {
  return dockerErrorMessage(err).includes("no such volume");
}
function dockerErrorMessage(err) {
  return (err instanceof Error ? err.message : String(err)).toLowerCase();
}

// src/mlclaw/gateway-location.ts
function parseGatewayLocation(value) {
  if (value === "local" || value === "space") {
    return value;
  }
  throw new Error("gateway must be one of: local, space");
}

// src/mlclaw/git.ts
import { execFile as execFile2 } from "node:child_process";
import fs13 from "node:fs/promises";
import os5 from "node:os";
import path14 from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
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
function readU32(b2, n) {
  let x3 = 0;
  x3 |= b2[n++] << 0;
  x3 |= b2[n++] << 8;
  x3 |= b2[n++] << 16;
  x3 |= b2[n++] << 24;
  return x3;
}
function writeU32(b2, n, x3) {
  b2[n++] = x3 >> 0 & 255;
  b2[n++] = x3 >> 8 & 255;
  b2[n++] = x3 >> 16 & 255;
  b2[n++] = x3 >> 24 & 255;
}
function imul(a, b2) {
  const ah = a >>> 16;
  const al = a & 65535;
  const bh = b2 >>> 16;
  const bl = b2 & 65535;
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
  return arr.reduce((a, b2) => a + b2, 0);
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
    const sortedOps = [...operations].sort((a, b2) => a.start - b2.start);
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
    const sortedOps = [...this.spliceOperations].sort((a, b2) => a.start - b2.start);
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
  function g(a, b2, c, d) {
    const mx = MSG_ACCESS_ORDER[msgIdx++];
    const my = MSG_ACCESS_ORDER[msgIdx++];
    put([32, 16 + a]);
    put([32, 16 + b2]);
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
    put([32, 16 + b2]);
    put([32, 16 + c]);
    put([253, 81]);
    put([34, 16 + b2]);
    put([65, 12]);
    put([253, 173, 1]);
    put([32, 16 + b2]);
    put([65, 20]);
    put([253, 171, 1]);
    put([253, 80]);
    put([33, 16 + b2]);
    put([32, 16 + a]);
    put([32, 16 + b2]);
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
    put([32, 16 + b2]);
    put([32, 16 + c]);
    put([253, 81]);
    put([34, 16 + b2]);
    put([65, 7]);
    put([253, 173, 1]);
    put([32, 16 + b2]);
    put([65, 25]);
    put([253, 171, 1]);
    put([253, 80]);
    put([33, 16 + b2]);
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
  function g(a, b2, c, d) {
    const mx = MSG_ACCESS_ORDER[msgIdx++];
    const my = MSG_ACCESS_ORDER[msgIdx++];
    put([32, 16 + a]);
    put([32, 16 + b2]);
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
    put([32, 16 + b2]);
    put([32, 16 + c]);
    put([253, 81]);
    put([34, 16 + b2]);
    put([65, 12]);
    put([253, 173, 1]);
    put([32, 16 + b2]);
    put([65, 20]);
    put([253, 171, 1]);
    put([253, 80]);
    put([33, 16 + b2]);
    put([32, 16 + a]);
    put([32, 16 + b2]);
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
    put([32, 16 + b2]);
    put([32, 16 + c]);
    put([253, 81]);
    put([34, 16 + b2]);
    put([65, 7]);
    put([253, 173, 1]);
    put([32, 16 + b2]);
    put([65, 25]);
    put([253, 171, 1]);
    put([253, 80]);
    put([33, 16 + b2]);
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
  function g(a, b2, c, d, mx, my) {
    const sa = 16 + a, sb = 16 + b2, sc = 16 + c, sd = 16 + d;
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
      files: Object.entries(this.fileProcessedBytes).map(([path17, processedBytes]) => ({
        path: path17,
        progress: processedBytes / this.fileSize[path17],
        lastSentProgress: ((this.fileUploadedBytes[path17] ?? 0) + (processedBytes - (this.fileUploadedBytes[path17] ?? 0)) * PROCESSING_PROGRESS_RATIO) / this.fileSize[path17]
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
      throw new Error(`xet upload returned no hash for: ${missing.map((f2) => f2.path).join(", ")}`);
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
    await this.batch(paths.map((path17) => ({ type: "deleteFile", path: path17 })));
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
  async downloadFile(path17) {
    const url = `${this.hubUrl}/buckets/${this.bucket}/resolve/${encodeURIComponent(path17)}`;
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

// src/mlclaw/hub-api.ts
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
    return parseHubIdentity(await this.requestJson("/api/whoami-v2"));
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
  async bucketExists(bucketId) {
    try {
      await this.bucket(bucketId).assertBucketAccessible();
      return true;
    } catch (err) {
      if (err instanceof BucketHttpError && err.status === 404) {
        return false;
      }
      throw err;
    }
  }
  async listBuckets(namespace) {
    const buckets = [];
    let url = `${this.hubUrl}/api/buckets/${encodeURIComponent(namespace ?? "me")}`;
    while (url) {
      const response = await this.request(url);
      const page = await response.json();
      for (const bucket of page) {
        const id = bucket.id ?? bucket.name;
        if (typeof id === "string" && id.includes("/")) buckets.push(id);
      }
      url = nextLink(response.headers.get("link"));
    }
    return [...new Set(buckets)].sort();
  }
  async deploymentControlStore(owner, deploymentId) {
    const repoId = `${owner}/mlclaw-control-${deploymentId.replaceAll("-", "")}`;
    await this.ensurePrivateModelRepo(repoId);
    const path17 = "control-lease.json";
    return {
      read: async () => await this.readModelDocument(repoId, path17),
      compareAndSwap: async (expectedRevision, value) => await this.commitModelDocument(repoId, path17, expectedRevision, value)
    };
  }
  async deploymentClaimStore(owner) {
    const repoId = `${owner}/mlclaw-control-claims`;
    await this.ensurePrivateModelRepo(repoId);
    const path17 = "control-lease.json";
    return {
      read: async () => await this.readModelDocument(repoId, path17),
      compareAndSwap: async (expectedRevision, value) => await this.commitModelDocument(repoId, path17, expectedRevision, value)
    };
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
  async spaceExists(repoId) {
    try {
      await this.requestJson(`/api/spaces/${repoId}`);
      return true;
    } catch (err) {
      if (err instanceof HubApiError2 && err.status === 404) {
        return false;
      }
      throw err;
    }
  }
  async getSpaceVisibility(repoId) {
    const info = await this.requestJson(`/api/spaces/${repoId}`);
    return info.private === true ? "private" : "public";
  }
  async updateSpaceVisibility(repoId, visibility) {
    await this.requestJson(`/api/spaces/${repoId}/settings`, {
      method: "PUT",
      body: JSON.stringify({ visibility }),
      headers: { "Content-Type": "application/json" }
    });
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
  async deleteSpaceSecret(repoId, key) {
    try {
      await this.requestJson(`/api/spaces/${repoId}/secrets`, {
        method: "DELETE",
        body: JSON.stringify({ key }),
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      if (err instanceof HubApiError2 && err.status === 404) {
        return;
      }
      throw err;
    }
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
    const runtime = await this.requestJson(`/api/spaces/${repoId}/runtime`);
    if (Array.isArray(runtime.volumes)) {
      return runtime;
    }
    try {
      const info = await this.requestJson(`/api/spaces/${repoId}`);
      if (Array.isArray(info.runtime?.volumes)) {
        return { ...runtime, volumes: info.runtime.volumes };
      }
    } catch {
    }
    return runtime;
  }
  async setSpaceVolumes(repoId, volumes) {
    await this.requestJson(`/api/spaces/${repoId}/volumes`, {
      method: "PUT",
      body: JSON.stringify({ volumes }),
      headers: { "Content-Type": "application/json" }
    });
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
    const response = await this.request(
      `/api/spaces/${repoId}/logs/${kind}`,
      {
        headers: { Accept: "text/event-stream" },
        signal: AbortSignal.timeout(5e3)
      },
      true
    );
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
      ...(params.deletePaths ?? []).map((path17) => ({
        key: "deletedFile",
        value: { path: path17 }
      }))
    ].map((entry) => JSON.stringify(entry)).join("\n");
    await this.request(`/api/spaces/${repoId}/commit/${encodeURIComponent(params.branch ?? "main")}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson" },
      body
    });
  }
  async ensurePrivateModelRepo(repoId) {
    const [owner, name] = splitRepoId(repoId);
    const me2 = await this.whoami();
    try {
      await this.requestJson("/api/repos/create", {
        method: "POST",
        body: JSON.stringify({
          name,
          organization: owner === me2.name ? null : owner,
          type: "model",
          private: true
        }),
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      if (!(error instanceof HubApiError2) || error.status !== 409) throw error;
    }
    const info = await this.requestJson(`/api/models/${repoId}`);
    if (info.sha) return;
    await this.commitModelDocument(repoId, "README.md", "", "# ML Claw deployment control\n");
  }
  async readModelDocument(repoId, path17) {
    const info = await this.requestJson(`/api/models/${repoId}`);
    if (!info.sha) throw new Error(`control repository ${repoId} has no revision`);
    const url = `${this.hubUrl}/${repoId}/resolve/${info.sha}/${path17.split("/").map(encodeURIComponent).join("/")}`;
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    if (response.status === 404) return { value: null, revision: info.sha };
    if (!response.ok) throw new HubApiError2(response.status, url, await response.text());
    return { value: JSON.parse(await response.text()), revision: info.sha };
  }
  async commitModelDocument(repoId, path17, parentCommit, value) {
    const header = {
      summary: value === null ? "Release deployment control" : "Update deployment control",
      description: "ML Claw deployment reconciliation state"
    };
    if (parentCommit) header.parentCommit = parentCommit;
    const operation = value === null ? { key: "deletedFile", value: { path: path17 } } : {
      key: "file",
      value: {
        path: path17,
        content: Buffer.from(typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}
`).toString(
          "base64"
        ),
        encoding: "base64"
      }
    };
    const body = [{ key: "header", value: header }, operation].map((entry) => JSON.stringify(entry)).join("\n");
    try {
      const response = await this.request(`/api/models/${repoId}/commit/main`, {
        method: "POST",
        headers: { "Content-Type": "application/x-ndjson" },
        body
      });
      const result = await response.json();
      if (!result.commitOid) throw new Error("Hub commit response omitted commitOid");
      return result.commitOid;
    } catch (error) {
      if (error instanceof HubApiError2 && (error.status === 409 || error.status === 412)) {
        throw new Error("deployment control lease changed concurrently", { cause: error });
      }
      throw error;
    }
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
function parseHubIdentity(value) {
  const root = record(value);
  const name = stringValue(root.name);
  if (!name) {
    throw new Error("Hugging Face identity response omitted the account name");
  }
  const organizations = Array.isArray(root.orgs) ? root.orgs.map((entry) => stringValue(record(entry).name)).filter((entry) => Boolean(entry)) : [];
  const auth = record(root.auth);
  const accessToken = record(auth.accessToken);
  const fineGrained = record(accessToken.fineGrained);
  const authType = stringValue(auth.type);
  const accessTokenRole = stringValue(accessToken.role);
  const scoped = Array.isArray(fineGrained.scoped) ? fineGrained.scoped.map(parseFineGrainedScope).filter((entry) => Boolean(entry)) : [];
  const global2 = stringArray(fineGrained.global);
  const canReadGatedRepos = fineGrained.canReadGatedRepos === true;
  const parsedAccessToken = {
    ...accessTokenRole ? { role: accessTokenRole } : {},
    ...Object.keys(fineGrained).length > 0 ? { fineGrained: { global: global2, scoped, canReadGatedRepos } } : {}
  };
  const parsedAuth = {
    ...authType ? { type: authType } : {},
    ...Object.keys(parsedAccessToken).length > 0 ? { accessToken: parsedAccessToken } : {}
  };
  return {
    name,
    organizations: [...new Set(organizations)].sort(),
    ...Object.keys(parsedAuth).length > 0 ? { auth: parsedAuth } : {}
  };
}
function parseFineGrainedScope(value) {
  const scope = record(value);
  const entity = record(scope.entity);
  const type = stringValue(entity.type);
  if (!type) return void 0;
  const name = stringValue(entity.name);
  return {
    entity: { type, ...name ? { name } : {} },
    permissions: stringArray(scope.permissions)
  };
}
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function stringArray(value) {
  return Array.isArray(value) ? [...new Set(value.filter((entry) => typeof entry === "string" && Boolean(entry.trim())))].map((entry) => entry.trim()).sort() : [];
}
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
function nextLink(header) {
  if (!header) return null;
  for (const part of header.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (match?.[1]) return match[1];
  }
  return null;
}

// src/mlclaw/runtime-image.ts
import fs12 from "node:fs";
import path13 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var DEFAULT_OPENCLAW_VERSION = "2026.7.1";
var DEFAULT_BROKERKIT_PLUGIN_VERSION = "0.2.1";
var DEFAULT_BROKERKIT_VERSION = "hf-broker/v0.1.0";
var DEFAULT_RUNTIME_IMAGE_REPOSITORY = "ghcr.io/osolmaz/mlclaw";
var PACKAGE_METADATA = readPackageMetadata();
var PACKAGE_VERSION = packageString("version", "unknown");
var OPENCLAW_VERSION = packageConfigString("openclawVersion", DEFAULT_OPENCLAW_VERSION);
var OPENCLAW_BASE_IMAGE = `ghcr.io/openclaw/openclaw:${OPENCLAW_VERSION}`;
var BROKERKIT_PLUGIN_VERSION = packageConfigString("brokerkitPluginVersion", DEFAULT_BROKERKIT_PLUGIN_VERSION);
var BROKERKIT_VERSION = packageConfigString("brokerkitVersion", DEFAULT_BROKERKIT_VERSION);
var RUNTIME_IMAGE_REPOSITORY = packageConfigString("runtimeImageRepository", DEFAULT_RUNTIME_IMAGE_REPOSITORY);
var DEFAULT_RUNTIME_IMAGE_TAG = `${PACKAGE_VERSION}-openclaw-${OPENCLAW_VERSION}`;
var DEFAULT_RUNTIME_IMAGE = `${RUNTIME_IMAGE_REPOSITORY}:${DEFAULT_RUNTIME_IMAGE_TAG}`;
function resolveRuntimeImage(value, env = process.env) {
  return value?.trim() || env.MLCLAW_RUNTIME_IMAGE?.trim() || DEFAULT_RUNTIME_IMAGE;
}
function resolveSpaceRuntimeImage(opts, env = process.env) {
  if (opts.bundledRuntime) {
    if (opts.runtimeImage?.trim() || env.MLCLAW_RUNTIME_IMAGE?.trim()) {
      throw new Error("--bundled-runtime cannot be combined with --runtime-image or MLCLAW_RUNTIME_IMAGE");
    }
    return void 0;
  }
  return resolveRuntimeImage(opts.runtimeImage, env);
}
function bundledSpaceRuntimeRef(templateRev) {
  return `bundled:${templateRev}`;
}
function packageString(key, fallback) {
  const value = PACKAGE_METADATA[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
function packageConfigString(key, fallback) {
  const value = PACKAGE_METADATA.config?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
function readPackageMetadata() {
  let dir = path13.dirname(fileURLToPath2(import.meta.url));
  while (true) {
    const candidate = path13.join(dir, "package.json");
    try {
      return JSON.parse(fs12.readFileSync(candidate, "utf8"));
    } catch (err) {
      if (!isMissingFileError(err)) {
        throw err;
      }
    }
    const parent = path13.dirname(dir);
    if (parent === dir) {
      throw new Error("could not find package.json while resolving default runtime image");
    }
    dir = parent;
  }
}
function isMissingFileError(err) {
  return err instanceof Error && "code" in err && err.code === "ENOENT";
}

// src/mlclaw/git.ts
var execFileAsync2 = promisify2(execFile2);
async function pushTemplateToSpace(params) {
  const tempRoot = await fs13.mkdtemp(path14.join(os5.tmpdir(), "mlclaw-space-"));
  try {
    const sourceDir = params.sourceDir ?? process.env.MLCLAW_SOURCE_DIR ?? await findPackagedSourceRoot();
    const templateRev = await currentTemplateRev(sourceDir);
    const outDir = path14.join(tempRoot, "space");
    await fs13.mkdir(outDir, { recursive: true });
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
      title: `Deploy ML Claw ${templateRev.slice(0, 12)}`
    });
    return { templateRev };
  } finally {
    await fs13.rm(tempRoot, { recursive: true, force: true });
  }
}
async function currentTemplateRev(sourceDir) {
  sourceDir ??= process.env.MLCLAW_SOURCE_DIR ?? await findPackagedSourceRoot();
  try {
    const { stdout } = await execFileAsync2("git", ["-C", sourceDir, "rev-parse", "HEAD"]);
    const rev = stdout.trim();
    if (rev) {
      return rev;
    }
  } catch {
  }
  const pkg = JSON.parse(await fs13.readFile(path14.join(sourceDir, "package.json"), "utf8"));
  return `npm:${pkg.name ?? "mlclaw"}@${pkg.version ?? "unknown"}`;
}
async function generateSpaceRepo(sourceDir, outDir, options = {}) {
  const copies = [
    [".gitattributes", ".gitattributes"],
    ["assets/assistant-avatar.svg", "assets/assistant-avatar.svg"],
    ["assets/hf-logo.svg", "assets/hf-logo.svg"],
    ["assets/mlclaw.svg", "assets/mlclaw.svg"],
    ["assets/mlclaw-control-ui", "assets/mlclaw-control-ui"],
    ["assets/hf-tooling", "assets/hf-tooling"],
    ["space/README.md", "README.md"]
  ];
  if (!options.runtimeImage) {
    copies.push(
      ["dist/hf-state-sync.js", "runtime/hf-state-sync.js"],
      ["dist/hf-tooling-seed.js", "runtime/hf-tooling-seed.js"],
      ["dist/mlclaw-space-runtime.js", "runtime/mlclaw-space-runtime.js"],
      ["entrypoint.sh", "runtime/entrypoint.sh"],
      ["openclaw.default.json", "runtime/openclaw.default.json"],
      ["scripts/configure-huggingface-model.mjs", "runtime/scripts/configure-huggingface-model.mjs"],
      ["scripts/configure-telegram.mjs", "runtime/scripts/configure-telegram.mjs"],
      ["scripts/report-telegram-probe.mjs", "runtime/scripts/report-telegram-probe.mjs"]
    );
  }
  for (const [from, to] of copies) {
    await copyExisting(path14.join(sourceDir, from), path14.join(outDir, to));
  }
  const hfLogoPng = await fs13.readFile(path14.join(sourceDir, "assets/hf-logo.png"));
  await fs13.writeFile(path14.join(outDir, "assets/hf-logo.png.base64"), `${hfLogoPng.toString("base64")}
`, "utf8");
  await fs13.writeFile(
    path14.join(outDir, "Dockerfile"),
    options.runtimeImage ? imageDockerfile(options.runtimeImage) : bundledDockerfile(),
    "utf8"
  );
}
function imageDockerfile(runtimeImage) {
  return `FROM ${runtimeImage}
`;
}
function bundledDockerfile() {
  return `ARG BROKERKIT_PLUGIN_VERSION=${BROKERKIT_PLUGIN_VERSION}
ARG BROKERKIT_VERSION=${BROKERKIT_VERSION}

FROM golang:1.26.5-bookworm AS hf-broker-build
ARG BROKERKIT_VERSION
RUN git init /src \\
  && git -C /src fetch --depth=1 https://github.com/osolmaz/brokerkit.git "refs/tags/$BROKERKIT_VERSION:refs/tags/$BROKERKIT_VERSION" \\
  && git -C /src checkout --detach "$BROKERKIT_VERSION" \\
  && test "$(git -C /src rev-parse "refs/tags/$BROKERKIT_VERSION^{commit}")" = "$(git -C /src rev-parse HEAD)" \\
  && cd /src \\
  && GOWORK=off go build -trimpath -o /out/hf-broker ./brokers/huggingface/cmd/hf-broker \\
  && /out/hf-broker policy render \\
    --preset request-all-agent-operations \\
    --client default \\
    --profile-out /out/hf-broker.policy-profile.json \\
    --output /out/hf-broker.scope.json \\
    --manifest-out /out/hf-broker.policy-manifest.json \\
  && /out/hf-broker doctor policy \\
    --profile /out/hf-broker.policy-profile.json \\
    --scope /out/hf-broker.scope.json \\
    --manifest /out/hf-broker.policy-manifest.json

FROM ${OPENCLAW_BASE_IMAGE}

LABEL org.opencontainers.image.source="https://github.com/osolmaz/mlclaw"
LABEL org.opencontainers.image.description="ML Claw runtime for OpenClaw on Hugging Face"

USER root
RUN apt-get update \\
  && apt-get install -y --no-install-recommends ca-certificates gosu python3 python3-pip python3-venv zstd \\
  && useradd --system --home-dir /var/lib/hf-broker --create-home --shell /usr/sbin/nologin hf-broker \\
  && rm -rf /var/lib/apt/lists/*
RUN python3 -m pip install --break-system-packages --no-cache-dir \\
  "huggingface_hub==1.19.0" \\
  "datasets==5.0.0" \\
  "safetensors==0.8.0" \\
  "fastapi==0.137.1" \\
  "pydantic==2.13.4" \\
  "rich==15.0.0" \\
  "starlette==1.3.1" \\
  "typer==0.25.1" \\
  "uvicorn==0.49.0" \\
  "uv==0.11.28" \\
  "hf-discover==1.3.7"
ARG BROKERKIT_PLUGIN_VERSION
RUN npm install --omit=dev --omit=peer --no-audit --no-fund --prefix /opt/openclaw-plugins   "openclaw-brokerkit@\${BROKERKIT_PLUGIN_VERSION}"   && test -f /opt/openclaw-plugins/node_modules/openclaw-brokerkit/openclaw.plugin.json

COPY --chown=node:node runtime/hf-state-sync.js /app/hf-state-sync.js
COPY --chown=node:node runtime/hf-tooling-seed.js /app/hf-tooling-seed.js
COPY --chown=node:node runtime/mlclaw-space-runtime.js /app/mlclaw-space-runtime.js
COPY --from=hf-broker-build /out/hf-broker /usr/local/bin/hf-broker
COPY --from=hf-broker-build /out/hf-broker.scope.json /app/hf-broker.scope.json
COPY --from=hf-broker-build /out/hf-broker.policy-profile.json /app/hf-broker.policy-profile.json
COPY --from=hf-broker-build /out/hf-broker.policy-manifest.json /app/hf-broker.policy-manifest.json
COPY --chown=node:node runtime/openclaw.default.json /app/openclaw.default.json
COPY --chown=node:node runtime/entrypoint.sh /app/entrypoint.sh
COPY --chown=node:node runtime/scripts/ /app/scripts/
COPY --chown=node:node assets/ /app/assets/
RUN base64 -d /app/assets/hf-logo.png.base64 > /app/assets/hf-logo.png   && rm /app/assets/hf-logo.png.base64   && chown node:node /app/assets/hf-logo.png   && chmod +x /app/entrypoint.sh

ENV PORT=7860
ENV MLCLAW_OPENCLAW_PORT=7861
ENV OPENCLAW_GATEWAY_PORT=7861
ENV OPENCLAW_LIVE_DIR=/home/node/.local/share/mlclaw/live
ENV OPENCLAW_STATE_DIR=/home/node/.local/share/mlclaw/live/.openclaw
ENV OPENCLAW_WORKSPACE_DIR=/home/node/.local/share/mlclaw/live/workspace
ENV OPENCLAW_CONFIG_PATH=/home/node/.local/share/mlclaw/live/.openclaw/openclaw.json
ENV OPENCLAW_DISABLE_BONJOUR=1
ENV MLCLAW_BROKERKIT_PLUGIN_PATH=/opt/openclaw-plugins/node_modules/openclaw-brokerkit

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 CMD node -e "const port=process.env.PORT||'7860'; fetch('http://127.0.0.1:'+port+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["/app/entrypoint.sh"]
`;
}
async function findPackagedSourceRoot() {
  const start = path14.dirname(fileURLToPath3(import.meta.url));
  let dir = start;
  while (true) {
    if (await hasPackagedSourceFiles(dir)) {
      return dir;
    }
    const parent = path14.dirname(dir);
    if (parent === dir) {
      throw new Error("Could not find packaged ML Claw source files. Reinstall the mlclaw npm package.");
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
    await Promise.all(required.map((file) => fs13.access(path14.join(dir, file))));
    return true;
  } catch {
    return false;
  }
}
async function copyExisting(from, to) {
  const stat = await fs13.stat(from);
  await fs13.mkdir(path14.dirname(to), { recursive: true });
  if (stat.isDirectory()) {
    await fs13.cp(from, to, { recursive: true });
  } else {
    await fs13.copyFile(from, to);
    await fs13.chmod(to, stat.mode);
  }
}
async function readFilesForCommit(root) {
  const files = [];
  for (const relativePath of await listFiles(root)) {
    files.push({
      path: relativePath,
      content: await fs13.readFile(path14.join(root, relativePath))
    });
  }
  return files;
}
async function listFiles(root, dir = "") {
  const absoluteDir = path14.join(root, dir);
  const entries = await fs13.readdir(absoluteDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path14.posix.join(dir.split(path14.sep).join(path14.posix.sep), entry.name);
    const absolutePath = path14.join(root, relativePath);
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      const stat = await fs13.stat(absolutePath);
      if (stat.isFile()) {
        files.push(relativePath);
      }
    }
  }
  return files.sort();
}

// src/hf-state-sync/paths.ts
var DEFAULT_BUCKET_PREFIX = "openclaw-state";
function remotePath(config, name) {
  return `${normalizeBucketPrefix(config.bucketPrefix)}/${name.replace(/^\/+/, "")}`;
}
function normalizeBucketPrefix(prefix) {
  const normalized = (prefix?.trim() || DEFAULT_BUCKET_PREFIX).replace(/^\/+|\/+$/g, "");
  return normalized || DEFAULT_BUCKET_PREFIX;
}

// src/mlclaw/lease.ts
var RUNTIME_STATUS_NAME = "runtime/status.json";
var RUNTIME_HANDOFF_REQUEST_NAME = "runtime/handoff-request.json";
var RUNTIME_HANDOFF_ACK_NAME = "runtime/handoff-ack.json";
var DEFAULT_LEASE_TTL_MS = 3 * 60 * 1e3;
function runtimeObjectPath(name, bucketPrefix) {
  return remotePath({ bucketPrefix: normalizeBucketPrefix(bucketPrefix) }, name);
}
async function readRuntimeLease(hub, bucket, bucketPrefix) {
  const blob = await hub.bucket(bucket).downloadFile(runtimeObjectPath(RUNTIME_STATUS_NAME, bucketPrefix));
  if (!blob) {
    return null;
  }
  return JSON.parse(await blob.text());
}
async function writeRuntimeHandoffRequest(hub, bucket, request, bucketPrefix) {
  await hub.bucket(bucket).uploadFiles([
    {
      path: runtimeObjectPath(RUNTIME_HANDOFF_REQUEST_NAME, bucketPrefix),
      content: new Blob([JSON.stringify(request, null, 2) + "\n"], { type: "application/json" })
    }
  ]);
}
async function readRuntimeHandoffAck(hub, bucket, bucketPrefix) {
  const blob = await hub.bucket(bucket).downloadFile(runtimeObjectPath(RUNTIME_HANDOFF_ACK_NAME, bucketPrefix));
  if (!blob) {
    return null;
  }
  return JSON.parse(await blob.text());
}
async function clearRuntimeHandoffRequest(hub, bucket, bucketPrefix) {
  await hub.bucket(bucket).deleteFiles([runtimeObjectPath(RUNTIME_HANDOFF_REQUEST_NAME, bucketPrefix)]);
}
function runtimeLeaseIsLive(lease, now = /* @__PURE__ */ new Date(), ttlMs = DEFAULT_LEASE_TTL_MS) {
  const last = Date.parse(lease.lastHeartbeatAt);
  return Number.isFinite(last) && now.getTime() - last < ttlMs;
}
async function assertNoLiveForeignLease(params) {
  const lease = await readRuntimeLease(params.hub, params.bucket, params.bucketPrefix);
  if (!lease || lease.runtimeId === params.runtimeId || params.allowedRuntimeIds?.includes(lease.runtimeId) || !runtimeLeaseIsLive(lease) || params.takeover) {
    return;
  }
  throw new Error(
    `another gateway appears active (${lease.gatewayLocation}, ${lease.runtimeId}, heartbeat ${lease.lastHeartbeatAt}); pass --takeover to replace it`
  );
}

// src/mlclaw-space-runtime/model-default.ts
var DEFAULT_MODEL_ID = "zai-org/GLM-5.2";
var DEFAULT_MODEL_PROVIDER = "fireworks-ai";
var DEFAULT_MODEL = `huggingface/${DEFAULT_MODEL_ID}:${DEFAULT_MODEL_PROVIDER}`;

// src/mlclaw-space-runtime/local-access.ts
import { createHmac, timingSafeEqual } from "node:crypto";
var LOCAL_ACCESS_CONTEXT = "mlclaw-local-access-v1";
function deriveLocalAccessToken(sessionSecret) {
  return createHmac("sha256", sessionSecret).update(LOCAL_ACCESS_CONTEXT).digest("base64url");
}

// src/mlclaw/local-config.ts
import fs14 from "node:fs/promises";
import os6 from "node:os";
import path15 from "node:path";
import { createHash as createHash2 } from "node:crypto";

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k2) => typeof obj[obj[k2]] !== "number");
    const filtered = {};
    for (const k2 of validKeys) {
      filtered[k2] = obj[k2];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e2) {
      return obj[e2];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path17, errorMaps, issueData } = params;
  const fullPath = [...path17, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage2 = "";
  const maps = errorMaps.filter((m2) => !!m2).slice().reverse();
  for (const map of maps) {
    errorMessage2 = map(fullIssue, { data, defaultError: errorMessage2 }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage2
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x3) => !!x3)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue2 = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue2.push(s.value);
    }
    return { status: status.value, value: arrayValue2 };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x3) => x3.status === "aborted";
var isDirty = (x3) => x3.status === "dirty";
var isValid = (x3) => x3.status === "valid";
var isAsync = (x3) => typeof Promise !== "undefined" && x3 instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path17, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path17;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b2) {
  const aType = getParsedType(a);
  const bType = getParsedType(b2);
  if (a === b2) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b2);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b2 };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b2[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b2.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b2[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b2) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x3) => !!x3);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x3) => !!x3),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x3) => !!x3),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me2 = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me2._def.args.parseAsync(args, params).catch((e2) => {
          error.addIssue(makeArgsIssue(args, e2));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me2._def.returns._def.type.parseAsync(result, params).catch((e2) => {
          error.addIssue(makeReturnsIssue(result, e2));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me2 = this;
      return OK(function(...args) {
        const parsedArgs = me2._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me2._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b2) {
    return new _ZodPipeline({
      in: a,
      out: b2,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p2 = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p22 = typeof p2 === "string" ? { message: p2 } : p2;
  return p22;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// src/mlclaw/naming.ts
var AGENT_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
function assertAgentName(value) {
  if (!AGENT_NAME_PATTERN.test(value)) {
    throw new Error(`invalid agent name: ${value}`);
  }
  return value;
}
function slugifyAgentName(raw) {
  const cleaned = raw.trim().replace(/^@/, "").replace(/(?:[_-]?bot)$/i, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").replace(/--+/g, "-");
  if (!cleaned) {
    throw new Error(`cannot derive an agent name from ${raw}`);
  }
  return assertAgentName(cleaned);
}
function namesFor(owner, agentName) {
  return {
    space: `${owner}/${agentName}`,
    bucket: `${owner}/${agentName}-data`
  };
}

// src/mlclaw/local-config.ts
var localGatewaySchema = external_exports.discriminatedUnion("engine", [
  external_exports.object({
    engine: external_exports.literal("docker"),
    dockerContext: external_exports.string().min(1).max(256),
    dockerEndpoint: external_exports.string().max(2048).optional()
  }).strict(),
  external_exports.object({
    engine: external_exports.literal("podman"),
    podmanConnection: external_exports.string().min(1).max(256),
    podmanEndpoint: external_exports.string().max(2048).optional()
  }).strict()
]);
var networkAccessSchema = external_exports.discriminatedUnion("provider", [
  external_exports.object({
    provider: external_exports.literal("tailscale-serve"),
    enabled: external_exports.boolean(),
    dnsName: external_exports.string().min(1).max(253),
    httpsPort: external_exports.number().int().min(1).max(65535),
    target: external_exports.string().url().max(2048),
    accessOrigin: external_exports.string().url().max(2048),
    pendingApproval: external_exports.boolean().optional()
  }).strict(),
  external_exports.object({
    provider: external_exports.literal("tailscale-direct"),
    enabled: external_exports.boolean(),
    ipv4: external_exports.string().ip({ version: "v4" }),
    dnsName: external_exports.string().min(1).max(253).optional(),
    port: external_exports.number().int().min(1).max(65535),
    accessOrigin: external_exports.string().url().max(2048)
  }).strict()
]);
var manifestFields = {
  agent: external_exports.string().regex(AGENT_NAME_PATTERN),
  owner: external_exports.string().min(1).max(128),
  bucket: external_exports.string().min(3).max(256),
  space: external_exports.string().min(3).max(256),
  localRuntimeId: external_exports.string().min(1).max(256),
  gatewayLocation: external_exports.enum(["local", "space"]),
  model: external_exports.string().min(1).max(512),
  runtimeImage: external_exports.string().min(1).max(1024),
  credentialKeySha256: external_exports.string().regex(/^[a-f0-9]{64}$/).optional(),
  tailscaleMode: external_exports.enum(["off", "direct", "serve"]).optional(),
  spaceVisibility: external_exports.enum(["private", "public"]).optional(),
  spaceHardware: external_exports.string().min(1).max(128).optional(),
  spaceSleepTime: external_exports.number().int().min(-1).optional(),
  recoveredWithoutCredentialKey: external_exports.boolean().optional(),
  pendingTombstoneBucket: external_exports.string().min(3).max(256).optional(),
  localPort: external_exports.number().int().min(1).max(65535).optional(),
  localGateway: localGatewaySchema.optional(),
  networkAccess: networkAccessSchema.optional(),
  createdAt: external_exports.string().datetime(),
  updatedAt: external_exports.string().datetime()
};
var manifestSchema = external_exports.object({
  version: external_exports.literal(2),
  deploymentId: external_exports.string().uuid(),
  desiredGeneration: external_exports.number().int().nonnegative(),
  ...manifestFields
}).strict();
var legacyManifestSchema = external_exports.object({ version: external_exports.literal(1), ...manifestFields }).strict();
function defaultConfigRoot(env = process.env) {
  const explicit = env.MLCLAW_CONFIG_HOME?.trim();
  if (explicit) {
    return explicit;
  }
  const xdg = env.XDG_CONFIG_HOME?.trim();
  if (xdg) {
    return path15.join(xdg, "mlclaw");
  }
  return path15.join(os6.homedir(), ".config", "mlclaw");
}
function localConfigPaths(root) {
  return {
    root,
    deploymentsDir: path15.join(root, "deployments"),
    secretsDir: path15.join(root, "secrets"),
    operationsDir: path15.join(root, "operations"),
    locksDir: path15.join(root, "locks")
  };
}
function manifestPath(root, agent) {
  return path15.join(localConfigPaths(root).deploymentsDir, `${assertAgentName(agent)}.json`);
}
function secretEnvPath(root, agent) {
  return path15.join(localConfigPaths(root).secretsDir, `${assertAgentName(agent)}.env`);
}
async function writeManifest(root, input) {
  const manifest = input.version === 1 ? importLegacyManifest(legacyManifestSchema.parse(input)) : manifestSchema.parse(input);
  const file = manifestPath(root, manifest.agent);
  await writePrivateFile(file, `${JSON.stringify(manifest, null, 2)}
`);
}
async function readManifest(root, agent) {
  const file = manifestPath(root, agent);
  const raw = JSON.parse(await fs14.readFile(file, "utf8"));
  const version = raw && typeof raw === "object" && "version" in raw ? raw.version : void 0;
  const parsed = version === 1 ? legacyManifestSchema.parse(raw) : manifestSchema.parse(raw);
  if (parsed.version === 1) {
    return importLegacyManifest(parsed);
  }
  if (parsed.version !== 2) {
    throw new Error(`unsupported deployment manifest version in ${file}`);
  }
  return parsed;
}
async function listManifests(root) {
  const dir = localConfigPaths(root).deploymentsDir;
  const entries = await fs14.readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const manifests = await Promise.all(
    entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => readManifest(root, entry.name.slice(0, -5)))
  );
  return manifests.sort((a, b2) => a.agent.localeCompare(b2.agent));
}
async function manifestExists(root, agent) {
  try {
    await fs14.access(manifestPath(root, agent));
    return true;
  } catch {
    return false;
  }
}
function renderSecretEnv(values) {
  return `${Object.entries(values).map(([key, value]) => renderEnvLine(key, value)).join("\n")}
`;
}
async function writeSecretEnv(root, agent, values) {
  const file = secretEnvPath(root, agent);
  await writePrivateFile(file, renderSecretEnv(values));
}
async function readSecretEnv(root, agent) {
  return parseSecretEnv(await fs14.readFile(secretEnvPath(root, agent), "utf8"));
}
function parseSecretEnv(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }
    const equals = line.indexOf("=");
    if (equals <= 0) {
      continue;
    }
    const key = line.slice(0, equals).trim();
    out[key] = line.slice(equals + 1);
  }
  return out;
}
function renderEnvLine(key, value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    throw new Error(`invalid env key: ${key}`);
  }
  if (/[\r\n]/.test(value)) {
    throw new Error(`env value for ${key} cannot contain newlines`);
  }
  return `${key}=${value}`;
}
function importLegacyManifest(manifest) {
  const digest = createHash2("sha256").update(`${manifest.owner}\0${manifest.bucket}\0${manifest.agent}`).digest("hex");
  const deploymentId = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  return { ...manifest, version: 2, deploymentId, desiredGeneration: 0 };
}
async function writePrivateFile(file, content) {
  await fs14.mkdir(path15.dirname(file), { recursive: true, mode: 448 });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs14.writeFile(temporary, content, { encoding: "utf8", mode: 384, flag: "wx" });
  await fs14.rename(temporary, file);
  await fs14.chmod(file, 384);
}

// src/mlclaw/deployment-state.ts
import fs15 from "node:fs/promises";
import os7 from "node:os";
import path16 from "node:path";
import { randomUUID } from "node:crypto";
var DEPLOYMENT_PATH = ".mlclaw/deployment.json";
var DESIRED_STATE_PATH = ".mlclaw/desired-state.json";
var TOMBSTONE_PATH = ".mlclaw/tombstone.json";
var MAX_CONTROL_BYTES = 64 * 1024;
var LOCAL_LOCK_HEARTBEAT_MS = 3e4;
var LOCAL_LOCK_STALE_MS = 5 * 6e4;
var identitySchema = external_exports.object({
  schemaVersion: external_exports.literal(1),
  deploymentId: external_exports.string().uuid(),
  agent: external_exports.string().regex(AGENT_NAME_PATTERN),
  owner: external_exports.string().min(1).max(128),
  bucket: external_exports.string().min(3).max(256),
  statePrefix: external_exports.string().min(1).max(256),
  credentialKeySha256: external_exports.string().regex(/^[a-f0-9]{64}$/),
  createdAt: external_exports.string().datetime()
}).strict();
var desiredStateSchema = external_exports.object({
  schemaVersion: external_exports.literal(1),
  deploymentId: external_exports.string().uuid(),
  generation: external_exports.number().int().nonnegative(),
  updatedAt: external_exports.string().datetime(),
  gateway: external_exports.object({
    location: external_exports.enum(["local", "space"]),
    port: external_exports.number().int().min(1).max(65535),
    tailscaleMode: external_exports.enum(["off", "direct", "serve"])
  }).strict(),
  model: external_exports.string().min(1).max(512),
  runtimeImage: external_exports.string().min(1).max(1024),
  space: external_exports.object({
    repo: external_exports.string().min(3).max(256),
    visibility: external_exports.enum(["private", "public"]),
    hardware: external_exports.string().min(1).max(128).optional(),
    sleepTime: external_exports.number().int().min(-1).optional()
  }).strict()
}).strict();
var operationStateSchema = external_exports.enum([
  "planned",
  "applying",
  "waiting_for_approval",
  "verifying",
  "rolling_back",
  "completed",
  "failed",
  "cleaned"
]);
var operationSchema = external_exports.object({
  schemaVersion: external_exports.literal(1),
  operationId: external_exports.string().uuid(),
  deploymentId: external_exports.string().uuid(),
  targetGeneration: external_exports.number().int().nonnegative(),
  state: operationStateSchema,
  startedAt: external_exports.string().datetime(),
  updatedAt: external_exports.string().datetime(),
  detail: external_exports.string().max(1e3).optional()
}).strict();
var leaseSchema = external_exports.object({
  schemaVersion: external_exports.literal(1),
  deploymentId: external_exports.string().uuid(),
  operationId: external_exports.string().uuid(),
  holderId: external_exports.string().min(1).max(256),
  fencingToken: external_exports.string().uuid(),
  generation: external_exports.number().int().nonnegative(),
  acquiredAt: external_exports.string().datetime(),
  expiresAt: external_exports.string().datetime()
}).strict();
var tombstoneSchema = external_exports.object({
  schemaVersion: external_exports.literal(1),
  deploymentId: external_exports.string().uuid(),
  movedTo: external_exports.string().min(3).max(256),
  tombstonedAt: external_exports.string().datetime()
}).strict();
function deploymentIdentity(manifest, statePrefix = "openclaw-state") {
  if (!manifest.credentialKeySha256) throw new Error("deployment credential key fingerprint is missing");
  return identitySchema.parse({
    schemaVersion: 1,
    deploymentId: manifest.deploymentId,
    agent: manifest.agent,
    owner: manifest.owner,
    bucket: manifest.bucket,
    statePrefix,
    credentialKeySha256: manifest.credentialKeySha256,
    createdAt: manifest.createdAt
  });
}
function deploymentDesiredState(manifest, visibility = manifest.spaceVisibility ?? "private") {
  return desiredStateSchema.parse({
    schemaVersion: 1,
    deploymentId: manifest.deploymentId,
    generation: manifest.desiredGeneration,
    updatedAt: manifest.updatedAt,
    gateway: {
      location: manifest.gatewayLocation,
      port: manifest.localPort ?? 7860,
      tailscaleMode: manifest.tailscaleMode ?? (manifest.networkAccess?.provider === "tailscale-direct" ? "direct" : manifest.networkAccess?.provider === "tailscale-serve" && manifest.networkAccess.enabled ? "serve" : "off")
    },
    model: manifest.model,
    runtimeImage: manifest.runtimeImage,
    space: {
      repo: manifest.space,
      visibility,
      ...manifest.spaceHardware ? { hardware: manifest.spaceHardware } : {},
      ...typeof manifest.spaceSleepTime === "number" ? { sleepTime: manifest.spaceSleepTime } : {}
    }
  });
}
async function readDeploymentIdentity(client) {
  return await readDocument(client, DEPLOYMENT_PATH, identitySchema);
}
async function readDesiredState(client) {
  return await readDocument(client, DESIRED_STATE_PATH, desiredStateSchema);
}
async function readDeploymentTombstone(client) {
  return await readDocument(client, TOMBSTONE_PATH, tombstoneSchema);
}
async function writeDeploymentTombstone(client, deploymentId, movedTo, now) {
  const tombstone = tombstoneSchema.parse({
    schemaVersion: 1,
    deploymentId,
    movedTo,
    tombstonedAt: now.toISOString()
  });
  await client.uploadFiles([jsonBlob(TOMBSTONE_PATH, tombstone)]);
}
async function writeCanonicalState(client, identity, desired) {
  await client.uploadFiles([
    jsonBlob(DEPLOYMENT_PATH, identitySchema.parse(identity)),
    jsonBlob(DESIRED_STATE_PATH, desiredStateSchema.parse(desired))
  ]);
}
async function writeDeploymentIdentity(client, identity) {
  await client.uploadFiles([jsonBlob(DEPLOYMENT_PATH, identitySchema.parse(identity))]);
}
function newOperation(manifest, now) {
  return operationSchema.parse({
    schemaVersion: 1,
    operationId: randomUUID(),
    deploymentId: manifest.deploymentId,
    targetGeneration: manifest.desiredGeneration,
    state: "planned",
    startedAt: now.toISOString(),
    updatedAt: now.toISOString()
  });
}
async function writeOperation(root, client, operation) {
  const parsed = operationSchema.parse(operation);
  const local = path16.join(localConfigPaths(root).operationsDir, `${parsed.operationId}.json`);
  await atomicPrivateWrite(local, stringify(parsed));
  await client.uploadFiles([jsonBlob(`.mlclaw/operations/${parsed.operationId}.json`, parsed)]);
}
async function updateOperation(root, client, operation, state, now, detail) {
  const next = operationSchema.parse({
    ...operation,
    state,
    updatedAt: now.toISOString(),
    ...detail ? { detail } : {}
  });
  await writeOperation(root, client, next);
  return next;
}
async function readResumableOperation(root, deploymentId, targetGeneration) {
  const directory = localConfigPaths(root).operationsDir;
  const entries = await fs15.readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const operations = await Promise.all(
    entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map(async (entry) => {
      const raw = await fs15.readFile(path16.join(directory, entry.name), "utf8");
      return operationSchema.parse(JSON.parse(raw));
    })
  );
  return operations.filter(
    (operation) => operation.deploymentId === deploymentId && operation.targetGeneration === targetGeneration && (operation.state === "planned" || operation.state === "applying" || operation.state === "waiting_for_approval" || operation.state === "verifying")
  ).sort((a, b2) => b2.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}
async function withDeploymentLock(root, deploymentId, task) {
  const file = path16.join(localConfigPaths(root).locksDir, `${deploymentId}.lock`);
  await fs15.mkdir(path16.dirname(file), { recursive: true, mode: 448 });
  const token = randomUUID();
  const lock = stringify({ pid: process.pid, host: os7.hostname(), token, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
  try {
    await fs15.writeFile(file, lock, { flag: "wx", mode: 384 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    if (!await replaceStaleLocalLock(file, lock)) {
      throw new Error(`deployment ${deploymentId} is already being reconciled on this host`);
    }
  }
  let heartbeat = Promise.resolve();
  const heartbeatTimer = setInterval(() => {
    heartbeat = heartbeat.then(async () => await refreshOwnedLocalLock(file, token)).catch(() => void 0);
  }, LOCAL_LOCK_HEARTBEAT_MS);
  heartbeatTimer.unref();
  try {
    return await task();
  } finally {
    clearInterval(heartbeatTimer);
    await heartbeat;
    await removeOwnedLocalLock(file, token);
  }
}
async function replaceStaleLocalLock(file, replacement) {
  const guard = `${file}.reclaim`;
  try {
    await fs15.mkdir(guard);
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
  try {
    const [raw, stat] = await Promise.all([fs15.readFile(file, "utf8"), fs15.stat(file)]);
    const value = JSON.parse(raw);
    if (value.host !== os7.hostname() || typeof value.pid !== "number") return false;
    const createdAt = typeof value.createdAt === "string" ? Date.parse(value.createdAt) : Number.NaN;
    const lastRefresh = Number.isFinite(createdAt) ? Math.max(createdAt, stat.mtimeMs) : stat.mtimeMs;
    if (processIsAlive(value.pid) && Date.now() - lastRefresh <= LOCAL_LOCK_STALE_MS) return false;
    await fs15.rm(file);
    await fs15.writeFile(file, replacement, { flag: "wx", mode: 384 });
    return true;
  } catch {
    return false;
  } finally {
    await fs15.rm(guard, { recursive: true, force: true });
  }
}
async function refreshOwnedLocalLock(file, token) {
  if (!await localLockHasToken(file, token)) return;
  const now = /* @__PURE__ */ new Date();
  await fs15.utimes(file, now, now);
}
async function removeOwnedLocalLock(file, token) {
  if (await localLockHasToken(file, token)) await fs15.rm(file, { force: true });
}
async function localLockHasToken(file, token) {
  try {
    const value = JSON.parse(await fs15.readFile(file, "utf8"));
    return value.token === token;
  } catch {
    return false;
  }
}
function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}
async function acquireControlLease(store, manifest, operation, now) {
  const snapshot = await store.read();
  const current = snapshot.value === null ? null : leaseSchema.parse(snapshot.value);
  if (current && Date.parse(current.expiresAt) > now.getTime() && current.operationId !== operation.operationId) {
    throw new Error(`deployment is already controlled by ${current.holderId} until ${current.expiresAt}`);
  }
  const lease = leaseSchema.parse({
    schemaVersion: 1,
    deploymentId: manifest.deploymentId,
    operationId: operation.operationId,
    holderId: `${os7.hostname()}:${process.pid}`,
    fencingToken: randomUUID(),
    generation: manifest.desiredGeneration,
    acquiredAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 12e4).toISOString()
  });
  const revision = await store.compareAndSwap(snapshot.revision, lease);
  const verified = await store.read();
  if (verified.revision !== revision || leaseSchema.parse(verified.value).fencingToken !== lease.fencingToken)
    throw new Error("could not verify deployment control lease ownership");
  return { value: lease, revision };
}
async function releaseControlLease(store, lease) {
  const current = await store.read();
  if (current.revision === lease.revision && current.value !== null && leaseSchema.parse(current.value).fencingToken === lease.value.fencingToken) {
    await store.compareAndSwap(lease.revision, null);
  }
}
async function assertControlLease(store, lease, now) {
  const current = await store.read();
  const currentLease = current.value === null ? null : leaseSchema.parse(current.value);
  if (current.revision !== lease.revision || currentLease?.fencingToken !== lease.value.fencingToken || Date.parse(currentLease.expiresAt) <= now.getTime()) {
    throw new Error("deployment control lease ownership was lost");
  }
}
async function renewControlLease(store, lease, now) {
  await assertControlLease(store, lease, now);
  const renewed = leaseSchema.parse({
    ...lease.value,
    expiresAt: new Date(now.getTime() + 12e4).toISOString()
  });
  const revision = await store.compareAndSwap(lease.revision, renewed);
  const held = { value: renewed, revision };
  await assertControlLease(store, held, now);
  return held;
}
async function readDocument(client, file, schema) {
  const blob = await client.downloadFile(file);
  if (!blob) return null;
  if (blob.size > MAX_CONTROL_BYTES) throw new Error(`${file} exceeds ${MAX_CONTROL_BYTES} bytes`);
  return schema.parse(JSON.parse(await blob.text()));
}
function jsonBlob(path17, value) {
  return { path: path17, content: new Blob([stringify(value)], { type: "application/json" }) };
}
function stringify(value) {
  return `${JSON.stringify(value, null, 2)}
`;
}
async function atomicPrivateWrite(file, content) {
  await fs15.mkdir(path16.dirname(file), { recursive: true, mode: 448 });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs15.writeFile(temporary, content, { mode: 384, flag: "wx" });
  await fs15.rename(temporary, file);
  await fs15.chmod(file, 384);
}

// src/mlclaw/telegram.ts
var TELEGRAM_GET_ME_TIMEOUT_MS = 3e4;
var TELEGRAM_GET_ME_ATTEMPTS = 4;
async function getTelegramBot(token, apiRoot = "https://api.telegram.org", fetchImpl = fetch) {
  const root = apiRoot.replace(/\/+$/, "");
  const url = `${root}/bot${token}/getMe`;
  const response = await fetchWithRetry(url, fetchImpl);
  if (!response.ok) {
    throw new Error(`Telegram getMe failed: ${response.status} ${await response.text()}`);
  }
  const body = await response.json();
  if (!body.ok || !body.result?.username) {
    throw new Error(`Telegram getMe failed: ${body.description ?? "missing bot username"}`);
  }
  return body.result;
}
async function fetchWithRetry(url, fetchImpl) {
  let lastError;
  for (let attempt = 0; attempt < TELEGRAM_GET_ME_ATTEMPTS; attempt += 1) {
    try {
      return await fetchImpl(url, { signal: AbortSignal.timeout(TELEGRAM_GET_ME_TIMEOUT_MS) });
    } catch (err) {
      lastError = err;
      if (attempt < TELEGRAM_GET_ME_ATTEMPTS - 1) {
        await delay(250 * 2 ** attempt);
      }
    }
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Telegram getMe request failed after ${TELEGRAM_GET_ME_ATTEMPTS} attempts: ${detail}`);
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// src/mlclaw/hf-broker-credential.ts
var HF_TOKEN_CREATE_URL = "https://huggingface.co/settings/tokens/new";
var BROKER_PERSONAL_PERMISSIONS = [
  "collection.read",
  "collection.write",
  "discussion.write",
  "inference.endpoints.infer.write",
  "inference.endpoints.write",
  "inference.serverless.write",
  "job.write",
  "repo.access.read",
  "repo.content.read",
  "repo.write",
  "resourceGroup.write",
  "sql-console.embed.write",
  "user.billing.read",
  "user.mcp.read",
  "user.notifications.read",
  "user.notifications.write",
  "user.papers.write",
  "user.preferences.write",
  "user.settings.notifications.write",
  "user.social.likes.write",
  "user.webhooks.read",
  "user.webhooks.write"
];
var BROKER_GLOBAL_PERMISSIONS = ["discussion.write", "post.write"];
var BROKER_ORGANIZATION_PERMISSIONS = [
  "collection.read",
  "collection.write",
  "discussion.write",
  "inference.endpoints.infer.write",
  "inference.endpoints.write",
  "inference.serverless.write",
  "job.write",
  "org.auditLog.write",
  "org.billing.read",
  "org.members.read",
  "org.members.write",
  "org.networkSecurity.read",
  "org.networkSecurity.write",
  "org.read",
  "org.repos.read",
  "org.serviceAccounts.read",
  "org.serviceAccounts.write",
  "org.write",
  "repo.access.read",
  "repo.content.read",
  "repo.write",
  "resourceGroup.write",
  "sql-console.embed.write"
];
function buildBrokerTokenUrl(owner, accountName) {
  const url = new URL(HF_TOKEN_CREATE_URL);
  url.searchParams.set("tokenType", "fineGrained");
  for (const permission of BROKER_PERSONAL_PERMISSIONS) {
    url.searchParams.append("ownUserPermissions", permission);
  }
  for (const permission of BROKER_GLOBAL_PERMISSIONS) {
    url.searchParams.append("globalPermissions", permission);
  }
  url.searchParams.set("canReadGatedRepos", "true");
  if (owner !== accountName) {
    url.searchParams.append("orgs", owner);
    for (const permission of BROKER_ORGANIZATION_PERMISSIONS) {
      url.searchParams.append("orgPermissions", permission);
    }
  }
  return url.toString();
}
function assessBrokerCredential(identity, owner) {
  const accessToken = identity.auth?.accessToken;
  if (accessToken?.role === "write") {
    return { status: "sufficient" };
  }
  if (accessToken?.role === "read") {
    return { status: "insufficient", missing: requiredPermissions(owner, identity.name) };
  }
  if (accessToken?.role !== "fineGrained") {
    return {
      status: "unknown",
      reason: "Hugging Face does not expose permission details for this login credential"
    };
  }
  if (!accessToken.fineGrained) {
    return { status: "unknown", reason: "Hugging Face omitted this fine-grained token's permission details" };
  }
  const personalAvailable = new Set(scopedPermissions(accessToken.fineGrained.scoped, "user", identity.name));
  const globalAvailable = new Set(accessToken.fineGrained.global);
  const missing = BROKER_PERSONAL_PERMISSIONS.filter((permission) => !personalAvailable.has(permission)).map(String);
  missing.push(
    ...BROKER_GLOBAL_PERMISSIONS.filter((permission) => !globalAvailable.has(permission)).map(
      (permission) => `global:${permission}`
    )
  );
  if (!accessToken.fineGrained.canReadGatedRepos) {
    missing.push("canReadGatedRepos");
  }
  if (owner !== identity.name) {
    const organizationAvailable = new Set(scopedPermissions(accessToken.fineGrained.scoped, "org", owner));
    missing.push(
      ...BROKER_ORGANIZATION_PERMISSIONS.filter((permission) => !organizationAvailable.has(permission)).map(
        (permission) => `org:${permission}`
      )
    );
  }
  missing.sort();
  return missing.length === 0 ? { status: "sufficient" } : { status: "insufficient", missing };
}
function scopedPermissions(scopes, type, name) {
  if (!Array.isArray(scopes)) return [];
  return scopes.filter((scope) => scope.entity.type === type && (!scope.entity.name || scope.entity.name === name)).flatMap((scope) => scope.permissions);
}
function requiredPermissions(owner, accountName) {
  return [
    ...BROKER_PERSONAL_PERMISSIONS,
    ...BROKER_GLOBAL_PERMISSIONS.map((permission) => `global:${permission}`),
    "canReadGatedRepos",
    ...owner === accountName ? [] : BROKER_ORGANIZATION_PERMISSIONS.map((permission) => `org:${permission}`)
  ].sort();
}

// src/mlclaw/tailscale.ts
import { execFile as execFile3 } from "node:child_process";
import { promisify as promisify3 } from "node:util";
var execFileAsync3 = promisify3(execFile3);
var TAILSCALE_TIMEOUT_MS = 5e3;
var CliTailscaleRunner = class {
  constructor(run = runTailscale) {
    this.run = run;
  }
  async discover() {
    let status;
    try {
      status = JSON.parse((await this.run(["status", "--json"])).stdout);
    } catch (error) {
      return { ready: false, reason: commandErrorMessage(error) };
    }
    return parseTailscaleStatus(status);
  }
  async mappingState(mapping) {
    const config = await this.readServeConfig();
    return tailscaleServeMappingState(config, mapping);
  }
  async ensureMapping(mapping) {
    const state = await this.mappingState(mapping);
    if (state === "owned") {
      return "unchanged";
    }
    if (state === "conflict") {
      throw new Error(`Tailscale Serve HTTPS port ${mapping.httpsPort} is already in use`);
    }
    try {
      await this.run(["serve", "--bg", "--yes", `--https=${mapping.httpsPort}`, mapping.target]);
    } catch (error) {
      const message = commandErrorMessage(error);
      const approvalUrl = extractTailscaleApprovalUrl(message);
      if (approvalUrl) throw new TailscaleApprovalRequiredError(approvalUrl, message);
      throw error;
    }
    if (await this.mappingState(mapping) !== "owned") {
      throw new Error("Tailscale Serve did not retain the requested ML Claw mapping");
    }
    return "created";
  }
  async removeMapping(mapping) {
    const state = await this.mappingState(mapping);
    if (state === "free") {
      return "missing";
    }
    if (state === "conflict") {
      return "drifted";
    }
    await this.run(["serve", "--yes", `--https=${mapping.httpsPort}`, "off"]);
    if (await this.mappingState(mapping) !== "free") {
      throw new Error("Tailscale Serve did not remove the ML Claw mapping");
    }
    return "removed";
  }
  async readServeConfig() {
    const { stdout } = await this.run(["serve", "status", "--json"]);
    try {
      return JSON.parse(stdout || "{}");
    } catch {
      throw new Error("Tailscale Serve returned invalid JSON");
    }
  }
};
function parseTailscaleStatus(value) {
  const status = recordValue(value);
  if (!status) {
    return { ready: false, reason: "Tailscale returned an invalid status" };
  }
  if (status.BackendState !== "Running") {
    return { ready: false, reason: `Tailscale is ${stringValue2(status.BackendState) ?? "not running"}` };
  }
  const self = recordValue(status.Self);
  if (self?.Online === false) {
    return { ready: false, reason: "Tailscale is offline" };
  }
  const ipv4 = arrayValue(self?.TailscaleIPs)?.find(
    (candidate) => typeof candidate === "string" && isTailscaleIpv4(candidate)
  );
  if (typeof ipv4 !== "string") return { ready: false, reason: "Tailscale IPv4 address is unavailable" };
  const dnsName = normalizeTailscaleDnsName(stringValue2(self?.DNSName));
  const tailnet = stringValue2(recordValue(status.CurrentTailnet)?.Name);
  return { ready: true, ipv4, ...dnsName ? { dnsName } : {}, ...tailnet ? { tailnet } : {} };
}
var TailscaleApprovalRequiredError = class extends Error {
  constructor(approvalUrl, message) {
    super(message);
    this.approvalUrl = approvalUrl;
    this.name = "TailscaleApprovalRequiredError";
  }
};
function extractTailscaleApprovalUrl(message) {
  const match = message.match(/https:\/\/login\.tailscale\.com\/[A-Za-z0-9_?&=./%-]+/);
  if (!match) return void 0;
  try {
    const url = new URL(match[0]);
    return url.protocol === "https:" && url.hostname === "login.tailscale.com" ? url.toString() : void 0;
  } catch {
    return void 0;
  }
}
function tailscaleServeMappingState(value, mapping) {
  const config = recordValue(value);
  if (!config) {
    throw new Error("Tailscale Serve returned an invalid configuration");
  }
  const tcp = recordValue(config.TCP);
  const web = recordValue(config.Web);
  const foreground = recordValue(config.Foreground);
  const expectedHostPort = `${mapping.dnsName}:${mapping.httpsPort}`;
  if (recordValue(config.AllowFunnel)?.[expectedHostPort] === true) {
    return "conflict";
  }
  if (Object.values(foreground ?? {}).some((candidate) => serveConfigUsesPort(candidate, mapping.httpsPort))) {
    return "conflict";
  }
  const tcpHandler = recordValue(tcp?.[String(mapping.httpsPort)]);
  const webEntries = Object.entries(web ?? {}).filter(([hostPort]) => hostPort.endsWith(`:${mapping.httpsPort}`));
  const portIsFree = !tcpHandler && webEntries.length === 0;
  if (portIsFree) {
    return "free";
  }
  if (tcpHandler?.HTTPS !== true || webEntries.length !== 1 || webEntries[0]?.[0] !== expectedHostPort) {
    return "conflict";
  }
  const webConfig = recordValue(webEntries[0][1]);
  const handlers = recordValue(webConfig?.Handlers);
  const handlerEntries = Object.entries(handlers ?? {});
  if (handlerEntries.length !== 1 || handlerEntries[0]?.[0] !== "/") {
    return "conflict";
  }
  const rootHandler = recordValue(handlerEntries[0][1]);
  return rootHandler?.Proxy === mapping.target ? "owned" : "conflict";
}
function serveConfigUsesPort(value, port) {
  const config = recordValue(value);
  if (!config) {
    return false;
  }
  if (recordValue(config.TCP)?.[String(port)]) {
    return true;
  }
  return Object.keys(recordValue(config.Web) ?? {}).some((hostPort) => hostPort.endsWith(`:${port}`));
}
function tailscaleAccessOrigin(mapping) {
  return `https://${mapping.dnsName}${mapping.httpsPort === 443 ? "" : `:${mapping.httpsPort}`}`;
}
function normalizeTailscaleDnsName(value) {
  const normalized = value?.trim().replace(/\.$/, "").toLowerCase();
  if (!normalized || normalized.length > 253 || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(normalized)) {
    return void 0;
  }
  return normalized;
}
async function runTailscale(args) {
  try {
    return await execFileAsync3("tailscale", args, {
      encoding: "utf8",
      timeout: TAILSCALE_TIMEOUT_MS,
      maxBuffer: 1024 * 1024
    });
  } catch (error) {
    throw new Error(commandErrorMessage(error), { cause: error });
  }
}
function commandErrorMessage(error) {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr.trim() : "";
  if (stderr) {
    return stderr;
  }
  const stdout = "stdout" in error && typeof error.stdout === "string" ? error.stdout.trim() : "";
  if (stdout) {
    return stdout;
  }
  if ("code" in error && error.code === "ENOENT") {
    return "Tailscale is not installed";
  }
  if ("killed" in error && error.killed === true) {
    return "Tailscale command timed out";
  }
  return error.message;
}
function recordValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function stringValue2(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function arrayValue(value) {
  return Array.isArray(value) ? value : void 0;
}
function isTailscaleIpv4(value) {
  const octets = value.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  return octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127;
}

// src/mlclaw/cli.ts
var DEFAULT_MODEL2 = DEFAULT_MODEL;
var DEFAULT_HARDWARE = "cpu-basic";
var TELEGRAM_HARDWARE = "cpu-upgrade";
var TELEGRAM_SLEEP_TIME = -1;
var DEFAULT_GATEWAY_LOCATION = "space";
var DEFAULT_LOCAL_PORT = 7860;
var DEFAULT_SPACE_OPENCLAW_PORT = 7861;
var LOCAL_VOLUME_MOUNT_PATH = "/tmp/mlclaw-local";
var LOCAL_LIVE_DIR = `${LOCAL_VOLUME_MOUNT_PATH}/openclaw-live`;
var SPACE_STATE_MOUNT_DIR = "/data/mlclaw-state";
var SPACE_LIVE_DIR = "/home/node/.local/share/mlclaw/live";
var SPACE_HANDOFF_TIMEOUT_MS = 12e4;
var SPACE_HANDOFF_POLL_MS = 5e3;
var LOCAL_START_SETTLE_MS = 500;
var REMOTE_DISCOVERY_PROBE_TIMEOUT_MS = 5e3;
var REMOTE_DISCOVERY_TIMEOUT_MS = 2e4;
var STALE_PATH_VARS = ["OPENCLAW_STATE_DIR", "OPENCLAW_WORKSPACE_DIR", "OPENCLAW_CONFIG_PATH"];
var SNAPSHOT_MANIFEST_REMOTE_NAME = "manifest.json";
var DEFAULT_CANONICAL_TEMPLATE_SPACE = "osolmaz/mlclaw";
var PAID_HARDWARE_COST_NOTE = "Paid Hugging Face Space hardware costs money while allocated. The cheapest option is cpu-upgrade at $0.03/hour, about $22/month if kept always on.";
var defaultPrompt = {
  isInteractive: () => Boolean(process4.stdin.isTTY && process4.stdout.isTTY),
  intro: ge,
  outro: ye,
  note: Se,
  text: Pe,
  password: Ce,
  confirm: ue,
  select: async (params) => await xe(params),
  cancel: me
};
function createRuntime(overrides = {}) {
  return {
    env: overrides.env ?? process4.env,
    stdout: overrides.stdout ?? console,
    stderr: overrides.stderr ?? console,
    readToken: overrides.readToken ?? readToken,
    hfCli: overrides.hfCli ?? createSystemHfCli(overrides.env ?? process4.env),
    hubFactory: overrides.hubFactory ?? ((token) => new HubApi({ token })),
    pushTemplateToSpace: overrides.pushTemplateToSpace ?? pushTemplateToSpace,
    getTelegramBot: overrides.getTelegramBot ?? getTelegramBot,
    dockerRunner: overrides.dockerRunner ?? new CliDockerRunner(),
    podmanRunner: overrides.podmanRunner ?? new CliPodmanRunner(),
    tailscaleRunner: overrides.tailscaleRunner ?? new CliTailscaleRunner(),
    configRoot: overrides.configRoot ?? defaultConfigRoot(overrides.env ?? process4.env),
    now: overrides.now ?? (() => /* @__PURE__ */ new Date()),
    sleep: overrides.sleep ?? delay2,
    prompt: overrides.prompt ?? defaultPrompt
  };
}
function createProgram(runtimeOverrides = {}) {
  const runtime = createRuntime(runtimeOverrides);
  const program2 = new Command();
  program2.name("mlclaw").description("Deploy OpenClaw to a Hugging Face Space and private bucket").showHelpAfterError().exitOverride((err) => {
    throw err;
  });
  program2.command("bootstrap", { isDefault: true }).alias("configure").description("Create or update a Hugging Face OpenClaw deployment").option("--owner <owner>", "Hugging Face user or organization").option("--name <name>", "Agent and runtime resource base name").option("--bucket <owner/bucket>", "State bucket to create or adopt").option("--gateway <local|space>", "Where the live gateway runs").option("--telegram-token <token>", "Optional Telegram bot token").option("--telegram-token-file <path>", "File containing TELEGRAM_BOT_TOKEN=... or a raw token").option("--telegram-user-id <id>", "Allowed Telegram user ID").option("--telegram-api-root <url>", "Telegram API root override").option("--telegram-proxy <url>", "Telegram proxy URL override").option("--hardware <flavor>", "Hugging Face Space hardware flavor").option("--sleep-time <seconds>", "Space sleep timeout in seconds; -1 means never sleep", parseInteger).option("--model <model>", "OpenClaw model identifier").option("--runtime-image <image>", "ML Claw runtime image").option("--bundled-runtime", "Generate a bundled Space runtime instead of using the prebuilt ML Claw image", false).option("--public-space", "Create the Hugging Face Space as public instead of private", false).addOption(new Option("--gateway-token <token>").hideHelp()).option("--router-token <token>", "Hugging Face Router inference token for Space gateway model calls").option(
    "--router-token-file <path>",
    "File containing MLCLAW_ROUTER_TOKEN=..., HF_ROUTER_TOKEN=..., or a raw token"
  ).option("--broker-hf-token-file <path>", "File containing MLCLAW_BROKER_HF_TOKEN=... or a raw Hugging Face token").option("--docker-context <name>", "Docker context for local gateway mode").option("--container-runtime <auto|docker|podman>", "Local container runtime", "auto").option("--local-port <port>", "Loopback port for a local gateway", parseLocalPort).option("--tailscale <off|direct|serve>", "Tailnet access mode", parseTailscaleMode).option("--tailscale-port <port>", "Tailnet listener or Serve HTTPS port", parseLocalPort).option(
    "--allow-local-fallback",
    "Allow non-interactive Space bootstrap to fall back to a ready local runtime",
    false
  ).option("--no-pull", "Do not docker pull before starting a local gateway").option("--takeover", "Start even if a stale runtime lease is present", false).option("--yes", "Confirm paid hardware prompts for automation", false).action(async (opts) => {
    await bootstrap(opts, runtime);
  });
  program2.command("update").description("Regenerate and upload current ML Claw Space files").argument("<owner/space>", "Hugging Face Space repo ID").option("--runtime-image <image>", "Runtime image to write into the generated Space Dockerfile").option("--bundled-runtime", "Generate a bundled Space runtime instead of using the prebuilt ML Claw image", false).option("--router-token <token>", "Dedicated Hugging Face Router inference token").option(
    "--router-token-file <path>",
    "File containing MLCLAW_ROUTER_TOKEN=..., HF_ROUTER_TOKEN=..., or a raw token"
  ).option("--force", "Update even if the Space does not look like ML Claw", false).action(async (repoId, opts) => {
    const token = await runtime.readToken(runtime.env);
    const hub = runtime.hubFactory(token);
    await update(repoId, opts, hub, token, runtime);
  });
  program2.command("doctor").description("Check a ML Claw Space deployment").argument("<owner/space>", "Hugging Face Space repo ID").option("--fix", "Apply safe config repairs", false).option("--bucket <owner/bucket>", "State bucket to set when missing").action(async (repoId, opts) => {
    const token = await runtime.readToken(runtime.env);
    const hub = runtime.hubFactory(token);
    await doctor(repoId, opts, hub, runtime);
  });
  program2.command("settings").description("Update Hugging Face Space hardware and sleep settings").argument("<owner/space>", "Hugging Face Space repo ID").option("--gateway <local|space>", "Record gateway location in local manifest").option("--hardware <flavor>", "Hugging Face Space hardware flavor").option("--sleep-time <seconds>", "Space sleep timeout in seconds; -1 means never sleep", parseInteger).option("--yes", "Confirm paid hardware prompts for automation", false).action(async (repoId, opts) => {
    const token = await runtime.readToken(runtime.env);
    const hub = runtime.hubFactory(token);
    await settings(repoId, opts, hub, runtime);
  });
  const gateway = program2.command("gateway").description("Operate a ML Claw gateway");
  gateway.command("start").argument("<agent>", "Agent name").option("--docker-context <name>", "Set Docker context only when the deployment has no pinned context").option("--local-port <port>", "Loopback port for the local gateway", parseLocalPort).option("--tailscale <off|direct|serve>", "Tailnet access mode", parseTailscaleMode).option("--tailscale-port <port>", "Tailnet listener or Serve HTTPS port", parseLocalPort).option("--no-pull", "Do not docker pull before starting a local gateway").option("--takeover", "Start even if another live runtime lease is present", false).action(async (agent, opts) => {
    await gatewayStart(agent, opts, runtime);
  });
  gateway.command("stop").argument("<agent>", "Agent name").action(async (agent) => {
    await gatewayStop(agent, runtime);
  });
  gateway.command("restart").argument("<agent>", "Agent name").option("--no-pull", "Do not docker pull before starting a local gateway").option("--local-port <port>", "Loopback port for the local gateway", parseLocalPort).option("--tailscale <off|direct|serve>", "Tailnet access mode", parseTailscaleMode).option("--tailscale-port <port>", "Tailnet listener or Serve HTTPS port", parseLocalPort).option("--takeover", "Start even if another live runtime lease is present", false).action(async (agent, opts) => {
    await gatewayRestart(agent, opts, runtime);
  });
  gateway.command("status").argument("<agent>", "Agent name").action(async (agent) => {
    await gatewayStatus(agent, runtime);
  });
  gateway.command("logs").argument("<agent>", "Agent name").option("--tail <lines>", "Number of log lines", parseInteger, 200).action(async (agent, opts) => {
    await gatewayLogs(agent, opts, runtime);
  });
  gateway.command("migrate").argument("<agent>", "Agent name").requiredOption("--to <local|space>", "Target gateway location").option("--hardware <flavor>", "Hugging Face Space hardware flavor").option("--sleep-time <seconds>", "Space sleep timeout in seconds; -1 means never sleep", parseInteger).option("--runtime-image <image>", "ML Claw runtime image").option("--bundled-runtime", "Generate a bundled Space runtime instead of using the prebuilt ML Claw image", false).option("--public-space", "Create the Hugging Face Space as public instead of private", false).option("--router-token <token>", "Hugging Face Router inference token for Space gateway model calls").option(
    "--router-token-file <path>",
    "File containing MLCLAW_ROUTER_TOKEN=..., HF_ROUTER_TOKEN=..., or a raw token"
  ).option("--docker-context <name>", "Docker context for local gateway startup when migrating to local").option("--container-runtime <auto|docker|podman>", "Local container runtime", "auto").option("--local-port <port>", "Loopback port for the local gateway", parseLocalPort).option("--tailscale <off|direct|serve>", "Tailnet access mode", parseTailscaleMode).option("--tailscale-port <port>", "Tailnet listener or Serve HTTPS port", parseLocalPort).option("--no-pull", "Do not docker pull before starting a local gateway").option("--takeover", "Start even if another live runtime lease is present", false).option("--yes", "Confirm paid hardware prompts for automation", false).action(async (agent, opts) => {
    await gatewayMigrate(agent, opts, runtime);
  });
  gateway.command("rebind").argument("<agent>", "Agent name").requiredOption("--docker-context <name>", "Target Docker context").option("--no-pull", "Do not docker pull before starting the rebound local gateway").option("--takeover", "Rebind even if the old Docker context is unavailable", false).action(async (agent, opts) => {
    await gatewayRebind(agent, opts, runtime);
  });
  const state = program2.command("state").description("Operate ML Claw durable state");
  state.command("adopt").description("Point an existing deployment at a state bucket").argument("<agent>", "Agent name").requiredOption("--bucket <owner/bucket>", "State bucket to adopt").option("--no-pull", "Do not docker pull before restarting a local gateway").option("--takeover", "Adopt even if another live runtime lease is present", false).option("--yes", "Confirm adoption prompts for automation", false).action(async (agent, opts) => {
    await stateAdopt(agent, opts, runtime);
  });
  return program2;
}
async function main(argv = process4.argv.slice(2), runtimeOverrides = {}) {
  const program2 = createProgram(runtimeOverrides);
  try {
    await program2.parseAsync(argv, { from: "user" });
    return typeof process4.exitCode === "number" && process4.exitCode !== 0 ? process4.exitCode : 0;
  } catch (err) {
    if (err instanceof CommanderError) {
      return err.exitCode;
    }
    const runtime = createRuntime(runtimeOverrides);
    runtime.stderr.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
}
async function resolveBootstrapAgentName(params) {
  if (params.requestedName) return slugifyAgentName(params.requestedName);
  const local = (await listManifests(params.runtime.configRoot)).filter(
    (manifest) => !params.requestedOwner || manifest.owner === params.requestedOwner
  );
  if (local.length === 1) {
    const deployment = local[0];
    params.runtime.stdout.log(`Existing deployment found: ${deployment.agent}`);
    return deployment.agent;
  }
  if (local.length > 1) {
    if (!params.runtime.prompt.isInteractive()) {
      throw new Error("multiple deployments found; specify --name");
    }
    return slugifyAgentName(
      await promptSelect(
        "Which deployment should ML Claw configure?",
        local.map((manifest) => ({ value: manifest.agent, label: manifest.agent, hint: manifest.bucket })),
        local[0].agent,
        params.runtime
      )
    );
  }
  const remote = await discoverRemoteDeployments(params.owner, params.hub);
  if (remote.length === 1 && params.runtime.prompt.isInteractive()) {
    const deployment = remote[0];
    const recovered = await promptConfirm(
      `Recover deployment ${deployment.identity.agent} from ${deployment.identity.bucket}?`,
      true,
      params.runtime
    );
    if (recovered) {
      await cacheRecoveredDeployment(deployment, params.runtime);
      return deployment.identity.agent;
    }
  } else if (remote.length > 1) {
    if (!params.runtime.prompt.isInteractive()) throw new Error("multiple remote deployments found; specify --name");
    const selected = await promptSelect(
      "Which remote deployment should ML Claw recover?",
      remote.map(({ identity }) => ({ value: identity.deploymentId, label: identity.agent, hint: identity.bucket })),
      remote[0].identity.deploymentId,
      params.runtime
    );
    const deployment = remote.find(({ identity }) => identity.deploymentId === selected);
    if (!deployment) throw new Error("selected remote deployment disappeared");
    await cacheRecoveredDeployment(deployment, params.runtime);
    return deployment.identity.agent;
  }
  if (!params.runtime.prompt.isInteractive()) throw new Error("no deployment found; specify --name");
  return slugifyAgentName(await promptAgentName(params.runtime));
}
async function discoverRemoteDeployments(owner, hub) {
  const deadline = Date.now() + REMOTE_DISCOVERY_TIMEOUT_MS;
  const buckets = (await withDeadline(hub.listBuckets(owner), REMOTE_DISCOVERY_TIMEOUT_MS, [])).filter(
    (bucket) => bucket.startsWith(`${owner}/`)
  );
  const found = [];
  for (let offset = 0; offset < buckets.length; offset += 4) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const page = await Promise.all(
      buckets.slice(offset, offset + 4).map(async (bucket) => {
        return await withDeadline(
          (async () => {
            try {
              const client = hub.bucket(bucket);
              if (await readDeploymentTombstone(client)) return null;
              const identity = await readDeploymentIdentity(client);
              if (!identity || identity.owner !== owner || identity.bucket !== bucket) return null;
              const desired = await readDesiredState(client);
              if (!desired || desired.deploymentId !== identity.deploymentId) return null;
              return { identity, desired };
            } catch {
              return null;
            }
          })(),
          Math.min(REMOTE_DISCOVERY_PROBE_TIMEOUT_MS, remaining),
          null
        );
      })
    );
    found.push(...page.filter((item) => item !== null));
  }
  return found.sort((a, b2) => a.identity.agent.localeCompare(b2.identity.agent));
}
async function withDeadline(promise, milliseconds, fallback) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(fallback), Math.max(0, milliseconds));
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
async function cacheRecoveredDeployment(deployment, runtime) {
  const { identity, desired } = deployment;
  const now = runtime.now().toISOString();
  await writeManifest(runtime.configRoot, {
    version: 2,
    deploymentId: identity.deploymentId,
    desiredGeneration: desired.generation,
    agent: identity.agent,
    owner: identity.owner,
    bucket: identity.bucket,
    space: desired.space.repo,
    localRuntimeId: newLocalRuntimeId(identity.agent),
    gatewayLocation: desired.gateway.location,
    model: desired.model,
    runtimeImage: desired.runtimeImage,
    tailscaleMode: desired.gateway.tailscaleMode,
    spaceVisibility: desired.space.visibility,
    ...desired.space.hardware ? { spaceHardware: desired.space.hardware } : {},
    ...typeof desired.space.sleepTime === "number" ? { spaceSleepTime: desired.space.sleepTime } : {},
    localPort: desired.gateway.port,
    credentialKeySha256: identity.credentialKeySha256,
    recoveredWithoutCredentialKey: true,
    createdAt: identity.createdAt,
    updatedAt: now
  });
  if (identity.statePrefix !== "openclaw-state") {
    await writeSecretEnv(runtime.configRoot, identity.agent, {
      OPENCLAW_HF_STATE_PREFIX: identity.statePrefix
    });
  }
}
async function bootstrap(opts, runtime) {
  runtime.prompt.intro("ML Claw bootstrap");
  const requestedGatewayLocation = opts.gateway ? parseGatewayLocation(opts.gateway) : void 0;
  const hfToken = await ensureHfToken({
    readToken: async () => await runtime.readToken(runtime.env),
    hfCli: runtime.hfCli,
    prompt: {
      isInteractive: runtime.prompt.isInteractive,
      note: runtime.prompt.note,
      confirm: async (message, initialValue) => await promptConfirm(message, initialValue, runtime)
    }
  });
  const hub = runtime.hubFactory(hfToken);
  const me2 = await hub.whoami();
  const selectionOwner = opts.owner ?? me2.name;
  const suppliedTelegramToken = await readOptionalTelegramToken(opts, runtime);
  let bot = suppliedTelegramToken ? await runtime.getTelegramBot(suppliedTelegramToken, opts.telegramApiRoot) : void 0;
  const requestedAgentName = opts.name ?? bot?.username;
  let agentName = await resolveBootstrapAgentName({
    ...requestedAgentName ? { requestedName: requestedAgentName } : {},
    ...opts.owner ? { requestedOwner: opts.owner } : {},
    owner: selectionOwner,
    hub,
    runtime
  });
  const selectedManifest = await readManifest(runtime.configRoot, agentName).catch(() => null);
  const selectedSecrets = await readSecretEnv(runtime.configRoot, agentName).catch(() => ({}));
  const owner = opts.owner ?? selectedManifest?.owner ?? selectionOwner;
  const telegramToken = suppliedTelegramToken ?? selectedSecrets.TELEGRAM_BOT_TOKEN;
  if (!bot && telegramToken) {
    bot = await runtime.getTelegramBot(telegramToken, opts.telegramApiRoot ?? selectedSecrets.TELEGRAM_API_ROOT);
  }
  const telegramUserId = telegramToken ? opts.telegramUserId ?? runtime.env.TELEGRAM_ALLOWED_USERS ?? selectedSecrets.TELEGRAM_ALLOWED_USERS ?? await promptRequired("Telegram allowed user ID", runtime) : void 0;
  const model = opts.model ?? DEFAULT_MODEL2;
  const runtimeImage = resolveRuntimeImage(opts.runtimeImage, runtime.env);
  resolveSpaceRuntimeImage(opts, runtime.env);
  let plan;
  let reviewedBrokerHfToken;
  for (; ; ) {
    plan = await resolveBootstrapPlan({
      opts,
      owner,
      agentName,
      hfToken,
      hfIdentity: me2,
      model,
      runtimeImage,
      hub,
      runtime,
      ...reviewedBrokerHfToken ? { providedBrokerHfToken: reviewedBrokerHfToken, brokerCredentialReviewed: true } : {},
      ...requestedGatewayLocation ? { requestedGatewayLocation } : {},
      ...telegramToken ? { telegramToken } : {},
      ...telegramUserId ? { telegramUserId } : {}
    });
    reviewedBrokerHfToken = plan.secrets.MLCLAW_BROKER_HF_TOKEN;
    const alternative = await promptAlternativeBootstrapName({
      plan,
      explicitBucket: opts.bucket,
      yes: Boolean(opts.yes),
      runtime
    });
    if (!alternative) {
      break;
    }
    agentName = alternative;
  }
  let activePlan = plan;
  let deployedSpaceRuntime;
  if (activePlan.gatewayLocation === "space") {
    if (opts.tailscale !== void 0 || opts.tailscalePort !== void 0) {
      throw new Error("Tailscale Serve access requires --gateway local");
    }
    const spacePlan = activePlan.spacePlan;
    if (!spacePlan) {
      throw new Error("internal error: Space plan was not resolved");
    }
    const paidHardware = await resolveHardware({
      ...opts.hardware ? { requestedHardware: opts.hardware } : {},
      ...typeof opts.sleepTime === "number" ? { requestedSleepTime: opts.sleepTime } : telegramToken ? { requestedSleepTime: TELEGRAM_SLEEP_TIME } : {},
      defaultLabel: spacePlan.exists ? "unchanged Space hardware" : "default Space CPU",
      requiresMessagingEgress: Boolean(telegramToken),
      yes: Boolean(opts.yes),
      runtime
    });
    activePlan.manifest = {
      ...activePlan.manifest,
      spaceVisibility: spacePlan.visibility,
      ...paidHardware.kind === "explicit" ? { spaceHardware: paidHardware.hardware } : {},
      ...typeof paidHardware.sleepTime === "number" ? { spaceSleepTime: paidHardware.sleepTime } : {}
    };
    await confirmBootstrapPlan({
      manifest: activePlan.manifest,
      ...activePlan.previousManifest ? { previousManifest: activePlan.previousManifest } : {},
      bucketPlan: activePlan.bucketPlan,
      spacePlan,
      hasExistingManifest: activePlan.hasExistingManifest,
      hardware: paidHardware.label,
      ...typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {},
      yes: Boolean(opts.yes),
      runtime
    });
    if (activePlan.bucketPlan.exists) {
      await assertNoLiveForeignLease({
        hub,
        bucket: activePlan.bucket,
        bucketPrefix: activePlan.bucketPrefix,
        runtimeId: spaceRuntimeId(agentName),
        takeover: Boolean(opts.takeover)
      });
    }
    try {
      await claimInitialBootstrap(activePlan, hub, runtime, async (assertLease) => {
        await createOrAdoptSpace({
          hub,
          spacePlan,
          runtime,
          ...paidHardware.kind === "explicit" ? { hardware: paidHardware.hardware } : {},
          ...typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}
        });
      });
    } catch (err) {
      if (!isHostedComputePaymentRequired(err) || spacePlan.exists) {
        throw err;
      }
      activePlan = await resolveHostedBootstrapFallback({
        error: err,
        opts,
        owner,
        agentName,
        hfToken,
        hfIdentity: me2,
        brokerHfToken: activePlan.secrets.MLCLAW_BROKER_HF_TOKEN ?? hfToken,
        model,
        runtimeImage,
        hub,
        runtime,
        ...telegramToken ? { telegramToken } : {},
        ...telegramUserId ? { telegramUserId } : {}
      });
    }
    if (activePlan.gatewayLocation === "space") {
      await assertNoLiveForeignLease({
        hub,
        bucket: activePlan.bucket,
        bucketPrefix: activePlan.bucketPrefix,
        runtimeId: spaceRuntimeId(agentName),
        takeover: Boolean(opts.takeover)
      });
      await reconcileDeployment(activePlan, hub, runtime, async (changed, assertLease) => {
        let observed;
        let requiresDeployment = !spacePlan.exists;
        if (!changed && !requiresDeployment) {
          const [spaceRuntime, variables] = await Promise.all([
            hub.getSpaceRuntime(activePlan.manifest.space),
            hub.getSpaceVariables(activePlan.manifest.space)
          ]);
          observed = { runtime: spaceRuntime, variables };
          requiresDeployment = spaceGatewayNeedsRepair(activePlan.manifest, variables, spaceRuntime, me2.name);
        }
        if (spacePlan.currentVisibility !== spacePlan.visibility) {
          await assertLease();
          await hub.updateSpaceVisibility(spacePlan.space, spacePlan.visibility);
        }
        if (changed || requiresDeployment) {
          await assertLease();
          const deployed = await deploySpaceGateway({
            hub,
            runtime,
            hfToken,
            manifest: activePlan.manifest,
            secrets: activePlan.secrets,
            allowedUsers: me2.name,
            spaceExists: spacePlan.exists,
            spacePrepared: true,
            assertLease,
            ...paidHardware.kind === "explicit" ? { hardware: paidHardware.hardware } : {},
            ...typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {},
            ...!opts.bundledRuntime && !activePlan.manifest.runtimeImage.startsWith("bundled:") ? { templateRuntimeImage: activePlan.manifest.runtimeImage } : {}
          });
          deployedSpaceRuntime = deployed.runtimeImage;
          await assertLease();
          await writeLocalDeployment(runtime.configRoot, activePlan.manifest, activePlan.secrets);
          return;
        }
        if (observed) {
          const previousSecrets = await readSecretEnv(runtime.configRoot, activePlan.agentName).catch(() => ({}));
          const secretsChanged = JSON.stringify(previousSecrets) !== JSON.stringify(activePlan.secrets);
          if (secretsChanged) {
            await assertLease();
            await setSpaceGatewaySecrets(hub, activePlan.manifest.space, hfToken, activePlan.secrets, assertLease);
            if (canDeleteBroadTokenSecrets({
              model: activePlan.manifest.model,
              routerTokenPresent: hasBrokerOrRouterTokenSecretRecord(activePlan.secrets)
            })) {
              await assertLease();
              await deleteStaleSpaceTokenSecrets(hub, activePlan.manifest.space, assertLease);
            }
            await assertLease();
            await writeLocalDeployment(runtime.configRoot, activePlan.manifest, activePlan.secrets);
          }
          const stage = typeof observed.runtime.stage === "string" ? observed.runtime.stage.toUpperCase() : "";
          const disabled = observed.variables.has("MLCLAW_GATEWAY_DISABLED");
          const stopped = disabled || stage === "PAUSED" || stage === "STOPPED" || stage === "SLEEPING";
          if (stopped) {
            await assertLease();
            if (disabled) await clearSpaceGatewayDisabled(hub, activePlan.manifest.space);
            await assertLease();
            await hub.restartSpace(activePlan.manifest.space, true);
            runtime.stdout.log(`Space gateway restart requested: ${activePlan.manifest.space}`);
          } else {
            runtime.stdout.log(`Space deployment already matches desired state: ${activePlan.manifest.space}`);
          }
          await assertLease();
          await writeManifest(runtime.configRoot, activePlan.manifest);
          return;
        }
        throw new Error("internal error: Space reconciliation had no observed or changed state");
      });
    }
  }
  if (activePlan.gatewayLocation === "local") {
    activePlan = await resolveBootstrapNetworkAccess(activePlan, opts, runtime);
    if (plan.gatewayLocation === "local") {
      await confirmBootstrapPlan({
        manifest: activePlan.manifest,
        ...activePlan.previousManifest ? { previousManifest: activePlan.previousManifest } : {},
        bucketPlan: activePlan.bucketPlan,
        hasExistingManifest: activePlan.hasExistingManifest,
        hardware: localGatewayLabel(requiredLocalGateway(activePlan.manifest)),
        yes: Boolean(opts.yes),
        runtime
      });
    }
    await claimInitialBootstrap(activePlan, hub, runtime, async () => void 0);
    await assertNoLiveForeignLease({
      hub,
      bucket: activePlan.bucket,
      bucketPrefix: activePlan.bucketPrefix,
      runtimeId: activePlan.manifest.localRuntimeId,
      takeover: Boolean(opts.takeover)
    });
    await reconcileDeployment(
      activePlan,
      hub,
      runtime,
      async (changed, assertLease) => await deployLocalBootstrap(activePlan, opts, runtime, changed, assertLease)
    );
  }
  runtime.stdout.log("");
  runtime.stdout.log(`Bucket: https://huggingface.co/buckets/${activePlan.bucket}`);
  if (activePlan.gatewayLocation === "space") {
    runtime.stdout.log(`Space:  https://huggingface.co/spaces/${activePlan.names.space}`);
    runtime.stdout.log(`Agent URL: ${spacePageUrl(activePlan.names.space)}`);
  } else {
    runtime.stdout.log(`Local:  ${containerNameFor(agentName)}`);
    logLocalGatewayUrls(activePlan.manifest, activePlan.secrets, runtime);
    runtime.stdout.log(localGatewayRemoteAccess(activePlan.manifest));
  }
  runtime.stdout.log(`Agent:  ${agentName}${bot ? ` (@${bot.username})` : ""}`);
  runtime.stdout.log(`Gateway: ${activePlan.gatewayLocation}`);
  if (activePlan.gatewayLocation === "local" && activePlan.manifest.localGateway) {
    runtime.stdout.log(`Container: ${localGatewayLabel(activePlan.manifest.localGateway)}`);
  }
  runtime.stdout.log(`Runtime image: ${runtimeImage}`);
  if (deployedSpaceRuntime) {
    runtime.stdout.log(`Space runtime: ${deployedSpaceRuntime}`);
  }
  if (activePlan.gatewayLocation === "space") {
    runtime.prompt.note(
      `Your agent is deploying and will be available shortly.

${spacePageUrl(activePlan.names.space)}`,
      "HERE IS YOUR ML CLAW"
    );
    runtime.prompt.outro("Bootstrap complete");
  } else {
    runtime.prompt.note(localGatewayAccessSummary(activePlan.manifest, activePlan.secrets), "HERE IS YOUR ML CLAW");
    runtime.prompt.outro(
      activePlan.waitingForApprovalUrl ? "Local gateway ready; run mlclaw bootstrap again after approving Tailscale Serve" : "Bootstrap complete"
    );
  }
}
async function reconcileDeployment(plan, hub, runtime, apply) {
  const result = await reconcileManifest({
    manifest: plan.manifest,
    bucketPrefix: plan.bucketPrefix,
    visibility: plan.spacePlan?.visibility,
    credentialKey: requiredSecret(plan.secrets, "MLCLAW_CREDENTIAL_KEY"),
    initialIdentityClaimed: !plan.hasExistingManifest,
    hub,
    runtime,
    apply: async ({ manifest, changed, assertLease }) => {
      plan.manifest = manifest;
      return await apply(changed, assertLease);
    }
  });
  if (!result.waitingForApproval) plan.manifest = result.manifest;
}
async function claimInitialBootstrap(plan, hub, runtime, provision) {
  if (plan.hasExistingManifest) {
    await createOrAdoptBucket({ hub, bucketPlan: plan.bucketPlan, runtime });
    await provision(async () => void 0);
    return;
  }
  const control = await hub.deploymentClaimStore(plan.manifest.owner);
  const operation = newOperation(plan.manifest, runtime.now());
  const lease = await acquireControlLease(control, plan.manifest, operation, runtime.now());
  const assertLease = async () => {
    await assertControlLease(control, lease, runtime.now());
  };
  try {
    await assertLease();
    let identity = plan.bucketPlan.exists ? await readClaimedBootstrapIdentity(plan, hub) : null;
    if (identity) {
      assertBootstrapIdentityMatches(plan, identity);
    }
    await provision(assertLease);
    await assertLease();
    await createOrAdoptBucket({ hub, bucketPlan: plan.bucketPlan, runtime });
    await assertLease();
    const client = hub.bucket(plan.manifest.bucket);
    identity ??= await readClaimedBootstrapIdentity(plan, hub);
    if (identity) {
      assertBootstrapIdentityMatches(plan, identity);
    } else {
      await writeDeploymentIdentity(client, deploymentIdentity(plan.manifest, plan.bucketPrefix));
    }
    await assertLease();
  } finally {
    await releaseControlLease(control, lease);
  }
}
async function readClaimedBootstrapIdentity(plan, hub) {
  const client = hub.bucket(plan.manifest.bucket);
  const tombstone = await readDeploymentTombstone(client);
  if (tombstone) {
    throw new Error(`state bucket ${plan.manifest.bucket} was moved to ${tombstone.movedTo} and cannot be claimed`);
  }
  return await readDeploymentIdentity(client);
}
function assertBootstrapIdentityMatches(plan, identity) {
  if (identity.deploymentId !== plan.manifest.deploymentId || identity.owner !== plan.manifest.owner || identity.agent !== plan.manifest.agent || identity.bucket !== plan.manifest.bucket) {
    throw new Error(`bucket ${plan.manifest.bucket} has a different canonical deployment identity`);
  }
}
async function reconcileManifest(params) {
  const { hub, runtime } = params;
  const localLockKey = createHash3("sha256").update(`${params.manifest.owner}\0${params.manifest.agent}`).digest("hex");
  return await withDeploymentLock(runtime.configRoot, localLockKey, async () => {
    let requestedManifest = params.manifest;
    const client = hub.bucket(requestedManifest.bucket);
    const tombstone = await readDeploymentTombstone(client);
    if (tombstone) {
      throw new Error(
        `state bucket ${requestedManifest.bucket} was moved to ${tombstone.movedTo} and cannot be reconciled`
      );
    }
    const currentIdentity = await readDeploymentIdentity(client);
    const identityMatches = currentIdentity?.deploymentId === requestedManifest.deploymentId && currentIdentity.owner === requestedManifest.owner && currentIdentity.agent === requestedManifest.agent && currentIdentity.bucket === requestedManifest.bucket;
    const permittedBucketTransition = currentIdentity?.deploymentId === requestedManifest.deploymentId && currentIdentity.owner === requestedManifest.owner && currentIdentity.agent === requestedManifest.agent && currentIdentity.bucket === params.previousIdentityBucket && currentIdentity.bucket !== requestedManifest.bucket;
    if (currentIdentity && !identityMatches && !permittedBucketTransition) {
      throw new Error(`bucket ${requestedManifest.bucket} has a different canonical deployment identity`);
    }
    if (currentIdentity) {
      if (requestedManifest.credentialKeySha256 && requestedManifest.credentialKeySha256 !== currentIdentity.credentialKeySha256) {
        throw new Error("local credential key fingerprint does not match canonical deployment identity");
      }
      const verifiedManifest = {
        ...requestedManifest,
        credentialKeySha256: currentIdentity.credentialKeySha256
      };
      delete verifiedManifest.recoveredWithoutCredentialKey;
      requestedManifest = verifiedManifest;
    }
    if (requestedManifest.credentialKeySha256) {
      await restoreMatchingDeploymentCredentialKey(
        runtime,
        requestedManifest.agent,
        requestedManifest.credentialKeySha256,
        params.credentialKey,
        Boolean(currentIdentity) && !params.initialIdentityClaimed || !params.credentialKey
      );
    } else {
      const secrets = await ensureDeploymentCredentialKey(runtime, requestedManifest.agent);
      requestedManifest = {
        ...requestedManifest,
        credentialKeySha256: createHash3("sha256").update(requiredSecret(secrets, "MLCLAW_CREDENTIAL_KEY")).digest("hex")
      };
    }
    const currentDesired = await readDesiredState(client);
    if (currentDesired && currentDesired.deploymentId !== requestedManifest.deploymentId) {
      throw new Error(`bucket ${requestedManifest.bucket} desired state belongs to another deployment`);
    }
    const visibility = params.visibility ?? requestedManifest.spaceVisibility ?? "private";
    const candidate = deploymentDesiredState(requestedManifest, visibility);
    const sameDesired = currentDesired && JSON.stringify({ ...currentDesired, generation: 0, updatedAt: "" }) === JSON.stringify({ ...candidate, generation: 0, updatedAt: "" });
    if (currentDesired && currentDesired.generation > requestedManifest.desiredGeneration && !sameDesired) {
      throw new Error(
        `canonical desired state generation ${currentDesired.generation} is newer than local generation ${requestedManifest.desiredGeneration}; recover the deployment before applying changes`
      );
    }
    const interruptedOperation = !sameDesired && requestedManifest.desiredGeneration > (currentDesired?.generation ?? -1) ? await readResumableOperation(
      runtime.configRoot,
      requestedManifest.deploymentId,
      requestedManifest.desiredGeneration
    ) : null;
    const generation = sameDesired ? currentDesired.generation : interruptedOperation?.targetGeneration ?? Math.max(currentDesired?.generation ?? 0, requestedManifest.desiredGeneration) + 1;
    let manifest = {
      ...requestedManifest,
      spaceVisibility: visibility,
      desiredGeneration: generation,
      updatedAt: runtime.now().toISOString()
    };
    let operation = interruptedOperation ?? await readResumableOperation(runtime.configRoot, manifest.deploymentId, manifest.desiredGeneration) ?? newOperation(manifest, runtime.now());
    const control = currentIdentity ? await hub.deploymentControlStore(requestedManifest.owner, requestedManifest.deploymentId) : await hub.deploymentClaimStore(requestedManifest.owner);
    let lease = await acquireControlLease(control, manifest, operation, runtime.now());
    let renewalError;
    let renewal = Promise.resolve();
    const renewalTimer = setInterval(() => {
      renewal = renewal.then(async () => {
        if (renewalError) return;
        try {
          lease = await renewControlLease(control, lease, runtime.now());
        } catch (error) {
          renewalError = error;
        }
      });
    }, 45e3);
    const assertLease = async () => {
      await renewal;
      if (renewalError) throw renewalError;
      await assertControlLease(control, lease, runtime.now());
      if (renewalError) throw renewalError;
    };
    try {
      const [claimedTombstone, claimedIdentity, claimedDesired] = await Promise.all([
        readDeploymentTombstone(client),
        readDeploymentIdentity(client),
        readDesiredState(client)
      ]);
      if (JSON.stringify(claimedTombstone) !== JSON.stringify(tombstone) || JSON.stringify(claimedIdentity) !== JSON.stringify(currentIdentity) || JSON.stringify(claimedDesired) !== JSON.stringify(currentDesired)) {
        throw new Error("canonical deployment state changed while acquiring control; rerun the command");
      }
      await writeOperationState("planned");
      await writeOperationState("applying");
      await assertLease();
      const outcome = await params.apply({ manifest, changed: !sameDesired, assertLease });
      await assertLease();
      if (!sameDesired || !identityMatches) {
        await writeCanonicalState(
          client,
          identityMatches ? currentIdentity : deploymentIdentity(manifest, params.bucketPrefix),
          deploymentDesiredState(manifest, visibility)
        );
        await assertLease();
      }
      if (outcome?.waitingForApproval) {
        await writeOperationState("waiting_for_approval", "Tailscale Serve administrator approval is required");
        runtime.prompt.note(outcome.waitingForApproval, "TAILSCALE SERVE APPROVAL REQUIRED");
        return { manifest, waitingForApproval: outcome.waitingForApproval };
      }
      await writeOperationState("verifying");
      await assertLease();
      const verified = await readDesiredState(client);
      if (verified?.deploymentId !== manifest.deploymentId || verified.generation !== generation) {
        throw new Error("canonical deployment state could not be verified after reconciliation");
      }
      if (params.finalize) {
        await assertLease();
        manifest = await params.finalize({ manifest, assertLease }) ?? manifest;
        await assertLease();
      }
      await writeOperationState("completed");
      return { manifest };
    } catch (error) {
      await writeOperationState("failed", "Reconciliation failed; inspect local CLI diagnostics").catch(
        () => void 0
      );
      throw error;
    } finally {
      clearInterval(renewalTimer);
      await renewal;
      await releaseControlLease(control, lease);
    }
    async function writeOperationState(state, detail) {
      operation = await updateOperation(
        runtime.configRoot,
        client,
        operation,
        state,
        runtime.now(),
        ...detail ? [detail] : []
      );
    }
  });
}
function spacePageUrl(repoId) {
  return `https://huggingface.co/spaces/${repoId}`;
}
async function resolveBootstrapPlan(params) {
  const {
    opts,
    owner,
    agentName,
    requestedGatewayLocation,
    hfToken,
    hfIdentity,
    providedBrokerHfToken,
    brokerCredentialReviewed,
    telegramToken,
    telegramUserId,
    model,
    runtimeImage,
    hub,
    runtime
  } = params;
  const names = namesFor(owner, agentName);
  const now = runtime.now().toISOString();
  const existingManifest = await readManifest(runtime.configRoot, agentName).catch(() => null);
  const existingSecrets = await readSecretEnv(runtime.configRoot, agentName).catch(() => ({}));
  const effectiveBrokerHfToken = await resolveBrokerHfToken({
    opts,
    owner,
    hfToken,
    hfIdentity,
    ...providedBrokerHfToken ? { preferredToken: providedBrokerHfToken } : {},
    skipReview: Boolean(brokerCredentialReviewed),
    existingSecrets,
    runtime
  });
  const sessionSecret = existingSecrets.MLCLAW_SESSION_SECRET ?? randomBytes(48).toString("base64url");
  const restoredCredentialKey = existingSecrets.MLCLAW_CREDENTIAL_KEY ?? runtime.env.MLCLAW_CREDENTIAL_KEY;
  if (existingManifest?.recoveredWithoutCredentialKey && !restoredCredentialKey) {
    throw new Error(
      "recovered deployment requires its existing MLCLAW_CREDENTIAL_KEY; restore it in the environment and rerun bootstrap"
    );
  }
  const credentialKey = restoredCredentialKey ?? randomBytes(32).toString("base64url");
  const credentialKeySha256 = createHash3("sha256").update(credentialKey).digest("hex");
  if (existingManifest?.credentialKeySha256 && existingManifest.credentialKeySha256 !== credentialKeySha256) {
    throw new Error("MLCLAW_CREDENTIAL_KEY does not match the recovered deployment");
  }
  const gatewayLocation = requestedGatewayLocation ?? existingManifest?.gatewayLocation ?? DEFAULT_GATEWAY_LOCATION;
  const containerRuntime = parseContainerRuntimePreference(opts.containerRuntime);
  if (opts.dockerContext && gatewayLocation !== "local") {
    throw new Error("--docker-context only applies to local gateway mode");
  }
  if (opts.dockerContext && containerRuntime === "podman") {
    throw new Error("--docker-context cannot be used with --container-runtime podman");
  }
  const bucketPrefix = bootstrapBucketPrefix(existingManifest, existingSecrets, runtime);
  const localRuntimeId = existingManifest?.localRuntimeId ?? newLocalRuntimeId(agentName);
  const localPort = opts.localPort ?? existingManifest?.localPort ?? DEFAULT_LOCAL_PORT;
  const localGateway = gatewayLocation === "local" ? await resolveLocalGatewayBinding({
    manifest: existingManifest,
    requestedContext: opts.dockerContext,
    preference: containerRuntime,
    runtime,
    persist: false
  }) : existingManifest?.localGateway;
  const bucketPlan = await resolveBootstrapBucket({
    explicitBucket: opts.bucket,
    defaultBucket: names.bucket,
    existingManifest,
    bucketPrefix,
    hub
  });
  const bucket = bucketPlan.bucket;
  if (existingManifest && bucket !== existingManifest.bucket) {
    throw new Error(
      `bootstrap cannot move state from ${existingManifest.bucket} to ${bucket}; use mlclaw state adopt ${agentName} --bucket ${bucket}`
    );
  }
  const routerToken = await resolveRouterToken({
    opts,
    runtime,
    existingSecrets,
    model
  });
  let spacePlan;
  if (gatewayLocation === "space") {
    const exists = await hub.spaceExists(names.space);
    const currentVisibility = exists ? await hub.getSpaceVisibility(names.space) : void 0;
    spacePlan = {
      space: names.space,
      exists,
      visibility: opts.publicSpace ? "public" : existingManifest?.spaceVisibility ?? currentVisibility ?? "private",
      ...currentVisibility ? { currentVisibility } : {}
    };
  }
  const effectiveModel = opts.model ?? existingManifest?.model ?? model;
  const effectiveRuntimeImage = opts.runtimeImage ? runtimeImage : existingManifest?.runtimeImage ?? runtimeImage;
  const manifest = {
    version: 2,
    deploymentId: existingManifest?.deploymentId ?? randomUUID2(),
    desiredGeneration: existingManifest?.desiredGeneration ?? 0,
    agent: agentName,
    owner,
    bucket,
    space: names.space,
    localRuntimeId,
    gatewayLocation,
    model: effectiveModel,
    runtimeImage: effectiveRuntimeImage,
    credentialKeySha256,
    ...existingManifest?.tailscaleMode ? { tailscaleMode: existingManifest.tailscaleMode } : {},
    ...existingManifest?.spaceVisibility ? { spaceVisibility: existingManifest.spaceVisibility } : {},
    ...existingManifest?.spaceHardware ? { spaceHardware: existingManifest.spaceHardware } : {},
    ...typeof existingManifest?.spaceSleepTime === "number" ? { spaceSleepTime: existingManifest.spaceSleepTime } : {},
    ...existingManifest?.pendingTombstoneBucket ? { pendingTombstoneBucket: existingManifest.pendingTombstoneBucket } : {},
    ...gatewayLocation === "local" ? { localPort } : existingManifest?.localPort ? { localPort: existingManifest.localPort } : {},
    ...localGateway ? { localGateway } : {},
    ...gatewayLocation === "local" && existingManifest?.networkAccess ? { networkAccess: existingManifest.networkAccess } : {},
    createdAt: existingManifest?.createdAt ?? now,
    updatedAt: now
  };
  const effectiveTelegramToken = telegramToken ?? existingSecrets.TELEGRAM_BOT_TOKEN;
  const effectiveTelegramUserId = telegramUserId ?? existingSecrets.TELEGRAM_ALLOWED_USERS;
  const effectiveTelegramProxy = opts.telegramProxy ?? existingSecrets.TELEGRAM_PROXY;
  const effectiveTelegramApiRoot = opts.telegramApiRoot ?? existingSecrets.TELEGRAM_API_ROOT;
  const secrets = deploymentSecrets({
    hfToken: effectiveBrokerHfToken,
    ...effectiveTelegramToken ? { telegramToken: effectiveTelegramToken } : {},
    ...effectiveTelegramUserId ? { telegramUserId: effectiveTelegramUserId } : {},
    sessionSecret,
    credentialKey,
    owner,
    bucket,
    model: effectiveModel,
    agentName,
    runtimeImage: effectiveRuntimeImage,
    gatewayLocation,
    localPort,
    runtimeId: gatewayLocation === "local" ? manifest.localRuntimeId : spaceRuntimeId(agentName),
    ...bucketPrefix ? { bucketPrefix } : {},
    ...effectiveTelegramProxy ? { telegramProxy: effectiveTelegramProxy } : {},
    ...effectiveTelegramApiRoot ? { telegramApiRoot: effectiveTelegramApiRoot } : {},
    ...routerToken ? { routerToken } : {}
  });
  return {
    agentName,
    names,
    hasExistingManifest: Boolean(existingManifest),
    ...existingManifest ? { previousManifest: existingManifest } : {},
    gatewayLocation,
    ...bucketPrefix ? { bucketPrefix } : {},
    bucketPlan,
    bucket,
    ...spacePlan ? { spacePlan } : {},
    manifest,
    secrets
  };
}
async function resolveBootstrapNetworkAccess(plan, opts, runtime) {
  if (plan.gatewayLocation !== "local") {
    if (opts.tailscale !== void 0 || opts.tailscalePort !== void 0) {
      throw new Error("Tailscale access only applies to a local gateway");
    }
    return plan;
  }
  const existing = plan.manifest.networkAccess;
  let mode = opts.tailscale ?? plan.manifest.tailscaleMode ?? networkAccessMode(existing);
  let discovery = mode && mode !== "off" ? await runtime.tailscaleRunner.discover() : void 0;
  if (!mode && !opts.yes && runtime.prompt.isInteractive()) {
    discovery = await runtime.tailscaleRunner.discover();
    if (discovery.ready && await promptConfirm("Make this gateway available on your tailnet?", false, runtime)) {
      mode = parseTailscaleMode(
        await promptSelect(
          "How should tailnet access work?",
          [
            { value: "direct", label: "Direct private link", hint: "No additional setup" },
            { value: "serve", label: "HTTPS with Tailscale Serve", hint: "May require administrator approval" }
          ],
          "direct",
          runtime
        )
      );
    } else {
      mode = "off";
    }
  }
  mode ??= "off";
  if (mode === "off") {
    if (opts.tailscalePort !== void 0) throw new Error("--tailscale-port cannot be used with --tailscale=off");
    return withBootstrapNetworkAccess(plan, void 0);
  }
  assertLocalNetworkAccessHost(plan.manifest);
  if (!discovery?.ready) {
    throw new Error(discovery?.reason ?? "Tailscale is unavailable");
  }
  const port = opts.tailscalePort ?? networkAccessPort(existing) ?? localGatewayPort(plan.manifest);
  if (mode === "direct") {
    return withBootstrapNetworkAccess(plan, {
      provider: "tailscale-direct",
      enabled: true,
      ipv4: discovery.ipv4,
      ...discovery.dnsName ? { dnsName: discovery.dnsName } : {},
      port,
      accessOrigin: `http://${discovery.ipv4}:${port}`
    });
  }
  if (!discovery.dnsName) throw new Error("Tailscale MagicDNS is required for Serve mode");
  const mapping = {
    dnsName: discovery.dnsName,
    httpsPort: port,
    target: localGatewayUrl(plan.manifest)
  };
  const state = await runtime.tailscaleRunner.mappingState(mapping);
  if (state === "conflict") {
    throw new Error(`Tailscale Serve HTTPS port ${port} is already in use; choose --tailscale-port`);
  }
  return withBootstrapNetworkAccess(plan, {
    provider: "tailscale-serve",
    enabled: true,
    ...mapping,
    accessOrigin: tailscaleAccessOrigin(mapping)
  });
}
function withBootstrapNetworkAccess(plan, networkAccess) {
  const { networkAccess: _previous, ...base } = plan.manifest;
  const manifest = {
    ...base,
    tailscaleMode: networkAccessMode(networkAccess) ?? "off",
    ...networkAccess ? { networkAccess } : {}
  };
  return {
    ...plan,
    manifest,
    secrets: {
      ...plan.secrets,
      ...localAccessSecrets(manifest.owner, localGatewayPort(manifest), plan.secrets, networkAccess)
    }
  };
}
async function resolveBootstrapBucket(params) {
  const explicitBucket = params.explicitBucket ? parseBucketId(params.explicitBucket) : void 0;
  const bucket = explicitBucket ?? params.existingManifest?.bucket ?? params.defaultBucket;
  const exists = await params.hub.bucketExists(bucket);
  const inspection = exists ? await inspectStateBucket(params.hub, bucket, params.bucketPrefix) : { objectCount: 0 };
  return {
    bucket,
    exists,
    objectCount: inspection.objectCount
  };
}
async function promptAlternativeBootstrapName(params) {
  const existingDefaultBucket = !params.explicitBucket && params.plan.bucketPlan.exists;
  const existingSpace = params.plan.spacePlan?.exists === true;
  if (!existingDefaultBucket && !existingSpace || params.yes || !params.runtime.prompt.isInteractive()) {
    return void 0;
  }
  const current = params.plan.agentName;
  const suggestion = `${current}-2`;
  params.runtime.prompt.note(
    `The name ${current} maps to existing ML Claw resources. Enter another name for a fresh deployment, or leave this blank to update the existing one.`,
    "Existing resources"
  );
  const value = await params.runtime.prompt.text({
    message: "Alternative agent name",
    placeholder: suggestion
  });
  if (q(value)) {
    params.runtime.prompt.cancel("Cancelled");
    throw new Error("cancelled");
  }
  const raw = value.trim();
  if (!raw) {
    return void 0;
  }
  const alternative = slugifyAgentName(raw);
  return alternative === current ? void 0 : alternative;
}
async function confirmBootstrapPlan(params) {
  if (params.previousManifest) {
    const changes = deploymentChanges(params.previousManifest, params.manifest);
    params.runtime.prompt.note(
      [
        `Existing deployment: ${params.manifest.agent}`,
        ...changes.length > 0 ? changes : ["No configuration changes; external state will be verified."]
      ].join("\n"),
      "Bootstrap changes"
    );
    if (params.yes) return;
    if (!params.runtime.prompt.isInteractive()) {
      throw new Error("bootstrap confirmation required. Pass --yes to continue non-interactively.");
    }
    const confirmed = await promptConfirm(
      changes.length > 0 ? "Apply these changes?" : "Verify this deployment?",
      true,
      params.runtime
    );
    if (!confirmed) throw new Error("bootstrap was not confirmed");
    return;
  }
  const lines = [
    `Agent: ${params.manifest.agent}`,
    `Gateway: ${params.manifest.gatewayLocation}`,
    `Bucket: ${params.bucketPlan.bucket} (${params.bucketPlan.exists ? `exists; keeping ${params.bucketPlan.objectCount} object(s)` : "will be created as private"})`
  ];
  if (params.spacePlan) {
    lines.push(
      `Space: ${params.spacePlan.space} (${params.spacePlan.exists ? "exists; files, variables, secrets, and runtime will be updated" : `will be created as ${params.spacePlan.visibility}`})`
    );
    lines.push(`Hardware: ${params.hardware}`);
    lines.push(`Bucket mount: ${SPACE_STATE_MOUNT_DIR}`);
    lines.push(`Live state: ${SPACE_LIVE_DIR}`);
    if (typeof params.sleepTime === "number") {
      lines.push(`Sleep time: ${params.sleepTime}`);
    }
  } else {
    lines.push(`Local runtime: ${containerNameFor(params.manifest.agent)} (${params.hardware})`);
    lines.push(`Gateway URL: ${localGatewayUrl(params.manifest)}`);
    if (params.manifest.networkAccess) {
      lines.push(`Tailnet URL: ${params.manifest.networkAccess.accessOrigin}`);
    }
  }
  if (params.bucketPlan.exists || params.spacePlan?.exists) {
    lines.push(`Fresh deployment: use a different name, for example --name ${params.manifest.agent}-2`);
  }
  lines.push(`Model: ${params.manifest.model}`);
  lines.push(`Runtime image: ${params.manifest.runtimeImage}`);
  params.runtime.prompt.note(lines.join("\n"), "Bootstrap plan");
  if (params.yes) {
    return;
  }
  if (!params.runtime.prompt.isInteractive()) {
    throw new Error("bootstrap confirmation required. Pass --yes to continue non-interactively.");
  }
  const ok = await promptConfirm("Continue with this bootstrap plan?", true, params.runtime);
  if (!ok) {
    throw new Error("bootstrap was not confirmed");
  }
}
function deploymentChanges(previous, next) {
  const changes = [];
  add("Gateway", previous.gatewayLocation, next.gatewayLocation);
  add("Bucket", previous.bucket, next.bucket);
  add("Model", previous.model, next.model);
  add("Runtime image", previous.runtimeImage, next.runtimeImage);
  add("Gateway port", String(localGatewayPort(previous)), String(localGatewayPort(next)));
  add(
    "Tailnet access",
    networkAccessMode(previous.networkAccess) ?? "off",
    networkAccessMode(next.networkAccess) ?? "off"
  );
  return changes;
  function add(label, before, after) {
    if (before !== after) changes.push(`${label}: ${before} -> ${after}`);
  }
}
async function createOrAdoptBucket(params) {
  if (params.bucketPlan.exists) {
    params.runtime.stdout.log(`Using existing private bucket ${params.bucketPlan.bucket}`);
    return;
  } else {
    params.runtime.stdout.log(`Creating private bucket ${params.bucketPlan.bucket}`);
  }
  await params.hub.createBucket(params.bucketPlan.bucket, true);
}
async function createOrAdoptSpace(params) {
  if (params.spacePlan.exists) {
    params.runtime.stdout.log(`Updating existing Space ${params.spacePlan.space}`);
    return;
  }
  params.runtime.stdout.log(`Creating ${params.spacePlan.visibility} Space ${params.spacePlan.space}`);
  await params.hub.createDockerSpace(params.spacePlan.space, {
    private: params.spacePlan.visibility === "private",
    ...params.hardware ? { hardware: params.hardware } : {},
    ...typeof params.sleepTime === "number" ? { sleepTimeSeconds: params.sleepTime } : {}
  });
}
async function resolveHostedBootstrapFallback(params) {
  let localPlan;
  try {
    localPlan = await resolveBootstrapPlan({
      opts: params.opts,
      owner: params.owner,
      agentName: params.agentName,
      requestedGatewayLocation: "local",
      hfToken: params.hfToken,
      hfIdentity: params.hfIdentity,
      providedBrokerHfToken: params.brokerHfToken,
      brokerCredentialReviewed: true,
      model: params.model,
      runtimeImage: params.runtimeImage,
      hub: params.hub,
      runtime: params.runtime,
      ...params.telegramToken ? { telegramToken: params.telegramToken } : {},
      ...params.telegramUserId ? { telegramUserId: params.telegramUserId } : {}
    });
  } catch (localError) {
    throw new Error(
      `Hugging Face requires PRO for this Docker Space, and no local fallback is ready. ${localError instanceof Error ? localError.message : String(localError)}. Subscribe at https://huggingface.co/pro`,
      { cause: params.error }
    );
  }
  if (!params.runtime.prompt.isInteractive()) {
    if (!params.opts.allowLocalFallback) {
      throw new Error(
        "Hugging Face requires PRO for this Docker Space. Re-run with --allow-local-fallback to use the detected local container runtime, or subscribe at https://huggingface.co/pro",
        { cause: params.error }
      );
    }
  } else {
    params.runtime.prompt.note(
      `Hugging Face requires PRO to host this Docker Space. ${localGatewayLabel(requiredLocalGateway(localPlan.manifest))} is ready on this machine.`,
      "Hosted gateway unavailable"
    );
    const choice = await params.runtime.prompt.select({
      message: "How should ML Claw continue?",
      options: [
        { value: "local", label: "Run the gateway locally" },
        { value: "pro", label: "Stop and use Hugging Face PRO", hint: "https://huggingface.co/pro" },
        { value: "cancel", label: "Cancel" }
      ],
      initialValue: "local"
    });
    if (q(choice) || choice === "cancel") {
      params.runtime.prompt.cancel("Cancelled");
      throw new Error("bootstrap cancelled");
    }
    if (choice === "pro") {
      throw new Error("Subscribe at https://huggingface.co/pro, then run bootstrap again");
    }
  }
  await confirmBootstrapPlan({
    manifest: localPlan.manifest,
    ...localPlan.previousManifest ? { previousManifest: localPlan.previousManifest } : {},
    bucketPlan: localPlan.bucketPlan,
    hasExistingManifest: localPlan.hasExistingManifest,
    hardware: localGatewayLabel(requiredLocalGateway(localPlan.manifest)),
    yes: Boolean(params.opts.yes),
    runtime: params.runtime
  });
  return localPlan;
}
function isHostedComputePaymentRequired(err) {
  if (!(err instanceof HubApiError2) || err.status !== 402) {
    return false;
  }
  try {
    return new URL(err.url).pathname === "/api/repos/create";
  } catch {
    return false;
  }
}
function requiredLocalGateway(manifest) {
  if (!manifest.localGateway) {
    throw new Error("internal error: local gateway binding was not resolved");
  }
  return manifest.localGateway;
}
async function stateAdopt(agent, opts, runtime) {
  const bucket = parseBucketId(requiredOption(opts.bucket, "--bucket"));
  const current = await readDeploymentManifest(runtime, agent);
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  const secrets = await readSecretEnv(runtime.configRoot, agent);
  const bucketPrefix = persistedBucketPrefix(secrets);
  const bucketChanged = current.bucket !== bucket;
  const resumingBucketChange = !bucketChanged && Boolean(current.pendingTombstoneBucket);
  if (bucketChanged && current.pendingTombstoneBucket) {
    throw new Error(
      `finish tombstoning ${current.pendingTombstoneBucket} by adopting ${current.bucket} again before moving state`
    );
  }
  if (bucketChanged && current.gatewayLocation === "local") {
    assertDedicatedRouterToken(current.model, secrets);
  }
  runtime.stdout.log(`Creating or adopting private bucket ${bucket}`);
  await hub.createBucket(bucket, true);
  const targetTombstone = await readDeploymentTombstone(hub.bucket(bucket));
  if (targetTombstone) {
    throw new Error(`state bucket ${bucket} was moved to ${targetTombstone.movedTo} and cannot be adopted again`);
  }
  await inspectStateBucket(hub, bucket, bucketPrefix);
  await assertNoLiveForeignLease({
    hub,
    bucket,
    bucketPrefix,
    runtimeId: runtimeIdFor(current),
    takeover: Boolean(opts.takeover)
  });
  if (bucketChanged) {
    await confirmBucketChange({
      message: `Adopt state bucket ${bucket} for ${agent}, replacing ${current.bucket}?`,
      yes: Boolean(opts.yes),
      runtime
    });
  }
  let updated = {
    ...current,
    bucket,
    ...bucketChanged ? { pendingTombstoneBucket: current.bucket } : {},
    updatedAt: runtime.now().toISOString()
  };
  const updatedSecrets = {
    ...secrets,
    OPENCLAW_HF_STATE_BUCKET: bucket,
    OPENCLAW_AGENT_NAME: updated.agent,
    OPENCLAW_MODEL: updated.model,
    MLCLAW_GATEWAY_LOCATION: updated.gatewayLocation,
    MLCLAW_RUNTIME_IMAGE: updated.runtimeImage,
    MLCLAW_RUNTIME_ID: runtimeIdFor(updated)
  };
  const reconciled = await reconcileManifest({
    manifest: updated,
    bucketPrefix,
    ...updated.pendingTombstoneBucket ? { previousIdentityBucket: updated.pendingTombstoneBucket } : {},
    hub,
    runtime,
    apply: async ({ manifest: targetManifest, assertLease }) => {
      updated = targetManifest;
      if (bucketChanged) {
        await assertLease();
        if (current.gatewayLocation === "local") {
          await handoffAndStopLocalGateway({
            manifest: current,
            hub,
            runtime,
            bucketPrefix,
            targetRuntimeId: current.localRuntimeId
          });
        } else {
          await disableAndPauseSpaceGateway({
            manifest: current,
            hub,
            runtime,
            bucketPrefix,
            targetRuntimeId: spaceRuntimeId(current.agent)
          });
        }
      }
      await assertLease();
      await writeLocalDeployment(runtime.configRoot, updated, updatedSecrets);
      if (updated.gatewayLocation === "local") {
        if (bucketChanged || resumingBucketChange) {
          await assertLease();
          await startLocalGateway({
            manifest: updated,
            runtime,
            pull: shouldPull(opts),
            resetVolume: true,
            assertLease
          });
        } else {
          runtime.stdout.log(`Deployment already uses bucket ${bucket}`);
        }
        return;
      }
      await assertLease();
      await setDeploymentVariables(
        hub,
        updated.space,
        {
          OPENCLAW_HF_STATE_BUCKET: bucket,
          MLCLAW_STATE_MOUNT_DIR: SPACE_STATE_MOUNT_DIR,
          OPENCLAW_LIVE_DIR: SPACE_LIVE_DIR,
          MLCLAW_RUNTIME_SETTINGS_FILE: `${SPACE_LIVE_DIR}/.mlclaw/settings.json`,
          MLCLAW_GATEWAY_LOCATION: "space",
          MLCLAW_RUNTIME_ID: spaceRuntimeId(updated.agent)
        },
        assertLease
      );
      await ensureSpaceStateVolume(hub, updated.space, bucket, { assertMutation: assertLease });
      if (canDeleteBroadTokenSecrets({
        model: updated.model,
        routerTokenPresent: hasBrokerOrRouterTokenSecretRecord(secrets)
      })) {
        await deleteStaleSpaceTokenSecrets(hub, updated.space, assertLease);
      }
      await clearSpaceGatewayDisabled(hub, updated.space);
      if (bucketChanged || resumingBucketChange) {
        await assertLease();
        await hub.restartSpace(updated.space, true);
        runtime.stdout.log(`Space gateway restart requested: ${updated.space}`);
      } else {
        runtime.stdout.log(`Deployment already uses bucket ${bucket}`);
      }
    },
    finalize: async ({ manifest, assertLease }) => {
      if (!manifest.pendingTombstoneBucket) return;
      await assertLease();
      await writeDeploymentTombstone(
        hub.bucket(manifest.pendingTombstoneBucket),
        current.deploymentId,
        bucket,
        runtime.now()
      );
      const { pendingTombstoneBucket: _completed, ...completed } = manifest;
      await assertLease();
      await writeManifest(runtime.configRoot, completed);
      return completed;
    }
  });
  updated = reconciled.manifest;
  runtime.stdout.log(`State bucket: ${bucket}`);
}
async function inspectStateBucket(hub, bucket, bucketPrefix) {
  await hub.assertBucketAccessible(bucket);
  const client = hub.bucket(bucket);
  const entries = await client.listFiles();
  const fileEntries = entries.filter((entry) => entry.type === "file");
  const prefix = normalizeBucketPrefix(bucketPrefix);
  const prefixWithSlash = `${prefix}/`;
  const manifestPath2 = `${prefixWithSlash}${SNAPSHOT_MANIFEST_REMOTE_NAME}`;
  const payloadEntries = fileEntries.filter((entry) => !entry.path.startsWith(".mlclaw/"));
  const stateEntries = payloadEntries.filter(
    (entry) => entry.path === manifestPath2 || entry.path.startsWith(`${prefixWithSlash}snapshots/`) || entry.path.startsWith(`${prefixWithSlash}runtime/`)
  );
  if (payloadEntries.length > 0 && stateEntries.length === 0) {
    throw new Error(`bucket ${bucket} contains objects but no ML Claw state under ${prefix}`);
  }
  const hasSnapshotManifest = stateEntries.some((entry) => entry.path === manifestPath2);
  if (hasSnapshotManifest) {
    const blob = await client.downloadFile(manifestPath2);
    if (!blob) {
      throw new Error(`bucket ${bucket} listed ${manifestPath2}, but it could not be downloaded`);
    }
    const currentSnapshotPath = parseCurrentSnapshotPath(await blob.text(), bucket, manifestPath2);
    const filePaths = new Set(payloadEntries.map((entry) => entry.path));
    if (!filePaths.has(currentSnapshotPath)) {
      throw new Error(`bucket ${bucket} state manifest points to missing snapshot ${currentSnapshotPath}`);
    }
  }
  return {
    objectCount: payloadEntries.length
  };
}
function parseCurrentSnapshotPath(raw, bucket, manifestPath2) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`bucket ${bucket} has an invalid state manifest ${manifestPath2}: ${String(err)}`);
  }
  if (typeof parsed !== "object" || parsed === null || !("version" in parsed) || parsed.version !== 1 || !("current" in parsed) || typeof parsed.current !== "object" || parsed.current === null || !("path" in parsed.current) || typeof parsed.current.path !== "string" || parsed.current.path.length === 0) {
    throw new Error(`bucket ${bucket} has an invalid state manifest ${manifestPath2}: missing current snapshot path`);
  }
  return parsed.current.path;
}
async function confirmBucketChange(params) {
  if (params.yes) {
    return;
  }
  if (!params.runtime.prompt.isInteractive()) {
    throw new Error(`${params.message} Pass --yes to confirm.`);
  }
  params.runtime.prompt.note("The bucket is the durable OpenClaw identity and state pointer.", "State bucket");
  const ok = await promptConfirm(params.message, false, params.runtime);
  if (!ok) {
    throw new Error("state bucket adoption was not confirmed");
  }
}
function parseBucketId(raw) {
  const bucket = raw.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(bucket)) {
    throw new Error(`expected bucket id as owner/name, got ${raw}`);
  }
  return bucket;
}
function deploymentSecrets(params) {
  return {
    MLCLAW_BROKER_HF_TOKEN: params.hfToken,
    ...params.routerToken ? { MLCLAW_ROUTER_TOKEN: params.routerToken } : {},
    OPENCLAW_HF_STATE_BUCKET: params.bucket,
    OPENCLAW_MODEL: params.model,
    OPENCLAW_AGENT_NAME: params.agentName,
    MLCLAW_GATEWAY_LOCATION: params.gatewayLocation,
    MLCLAW_RUNTIME_IMAGE: params.runtimeImage,
    MLCLAW_RUNTIME_ID: params.runtimeId,
    MLCLAW_SESSION_SECRET: params.sessionSecret,
    MLCLAW_CREDENTIAL_KEY: params.credentialKey,
    MLCLAW_OPENCLAW_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
    OPENCLAW_GATEWAY_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
    ...params.gatewayLocation === "local" ? localAccessSecrets(params.owner, params.localPort, {}) : {},
    ...params.telegramToken ? { TELEGRAM_BOT_TOKEN: params.telegramToken } : {},
    ...params.telegramUserId ? { TELEGRAM_ALLOWED_USERS: params.telegramUserId } : {},
    ...params.bucketPrefix ? { OPENCLAW_HF_STATE_PREFIX: params.bucketPrefix } : {},
    ...params.telegramProxy ? { TELEGRAM_PROXY: params.telegramProxy } : {},
    ...params.telegramApiRoot ? { TELEGRAM_API_ROOT: params.telegramApiRoot } : {}
  };
}
function localAccessSecrets(owner, port, existing, networkAccess) {
  const localOrigin = `http://127.0.0.1:${port}`;
  return {
    MLCLAW_PUBLIC_URL: localOrigin,
    MLCLAW_ACCESS_ORIGINS: [
      localOrigin,
      ...networkAccess?.enabled && !networkAccessPendingApproval(networkAccess) ? [networkAccess.accessOrigin] : []
    ].join(","),
    MLCLAW_LOCAL_ACCESS_USER: owner,
    MLCLAW_ALLOWED_USERS: appendCsvValue(existing.MLCLAW_ALLOWED_USERS, owner),
    MLCLAW_ADMINS: appendCsvValue(existing.MLCLAW_ADMINS, owner)
  };
}
function appendCsvValue(existing, value) {
  return [
    .../* @__PURE__ */ new Set([
      ...(existing ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      value
    ])
  ].join(",");
}
async function writeLocalDeployment(configRoot2, manifest, secrets) {
  await writeManifest(configRoot2, manifest);
  await writeSecretEnv(configRoot2, manifest.agent, secrets);
}
async function deployLocalBootstrap(plan, opts, runtime, desiredChanged = true, assertLease = async () => void 0) {
  const previousManifest = await readManifest(runtime.configRoot, plan.agentName).catch(() => null);
  const previousSecrets = await readSecretEnv(runtime.configRoot, plan.agentName).catch(() => null);
  const previousContainer = previousManifest?.gatewayLocation === "local" && previousManifest.localGateway ? await localRunnerFor(previousManifest, runtime).inspect(
    containerNameFor(previousManifest.agent),
    localConnectionFor(previousManifest)
  ) : null;
  const runtimeImageDrift = Boolean(previousContainer?.image && previousContainer.image !== plan.manifest.runtimeImage);
  const networkAccessChanged = JSON.stringify(previousManifest?.networkAccess) !== JSON.stringify(plan.manifest.networkAccess);
  const previousNetworkState = networkAccessChanged && previousManifest?.networkAccess?.provider === "tailscale-serve" ? await runtime.tailscaleRunner.mappingState(networkAccessMapping(previousManifest.networkAccess)) : void 0;
  let startupAttempted = false;
  try {
    if (previousNetworkState === "owned" && previousManifest?.networkAccess) {
      await assertLease();
      await removeOwnedNetworkAccess(previousManifest.networkAccess, runtime);
    }
    await writeSecretEnv(runtime.configRoot, plan.agentName, plan.secrets);
    startupAttempted = true;
    await assertLease();
    await startLocalGateway({
      manifest: plan.manifest,
      runtime,
      pull: shouldPull(opts),
      refresh: desiredChanged || runtimeImageDrift || JSON.stringify(previousSecrets) !== JSON.stringify(plan.secrets),
      existing: previousContainer,
      assertLease
    });
    await assertLease();
    await writeManifest(runtime.configRoot, plan.manifest);
  } catch (error) {
    if (error instanceof TailscaleApprovalRequiredError && plan.manifest.networkAccess?.provider === "tailscale-serve") {
      plan.manifest = {
        ...plan.manifest,
        networkAccess: { ...plan.manifest.networkAccess, pendingApproval: true }
      };
      plan.secrets = {
        ...plan.secrets,
        ...localAccessSecrets(
          plan.manifest.owner,
          localGatewayPort(plan.manifest),
          plan.secrets,
          plan.manifest.networkAccess
        )
      };
      plan.waitingForApprovalUrl = error.approvalUrl;
      await assertLease();
      await writeSecretEnv(runtime.configRoot, plan.agentName, plan.secrets);
      await writeManifest(runtime.configRoot, plan.manifest);
      return { waitingForApproval: error.approvalUrl };
    }
    try {
      if (networkAccessChanged && plan.manifest.networkAccess) {
        await disableNetworkAccess(plan.manifest, runtime);
      }
      if (previousSecrets) {
        await writeSecretEnv(runtime.configRoot, plan.agentName, previousSecrets);
      } else {
        await fs16.rm(secretEnvPath(runtime.configRoot, plan.agentName), { force: true });
      }
      if (previousContainer?.running && previousManifest) {
        await startLocalGateway({ manifest: previousManifest, runtime, pull: false, refresh: true });
        runtime.stdout.log(`Previous local gateway restored: ${containerNameFor(previousManifest.agent)}`);
      } else if (previousContainer && previousManifest && startupAttempted) {
        await startLocalGateway({ manifest: previousManifest, runtime, pull: false, refresh: true });
        await localRunnerFor(previousManifest, runtime).stop(
          containerNameFor(previousManifest.agent),
          localConnectionFor(previousManifest)
        );
        if (previousNetworkState !== "owned") {
          await disableNetworkAccess(previousManifest, runtime);
        }
        runtime.stdout.log(`Previous stopped local gateway restored: ${containerNameFor(previousManifest.agent)}`);
      } else {
        if (startupAttempted) {
          await removeFailedBootstrapContainer(plan.manifest, runtime, !previousManifest);
        }
      }
      if (previousNetworkState === "owned" && previousManifest?.networkAccess) {
        await runtime.tailscaleRunner.ensureMapping(networkAccessMapping(previousManifest.networkAccess));
      }
      if (!previousManifest) {
        await fs16.rm(manifestPath(runtime.configRoot, plan.agentName), { force: true });
      }
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "local bootstrap and rollback both failed");
    }
    throw error;
  }
}
async function removeFailedBootstrapContainer(manifest, runtime, removeVolume) {
  const runner = localRunnerFor(manifest, runtime);
  const connection = localConnectionFor(manifest);
  const containerName = containerNameFor(manifest.agent);
  const existing = await runner.inspect(containerName, connection);
  if (existing?.running) {
    await runner.stop(containerName, connection);
  }
  if (existing) {
    await runner.rm(containerName, connection);
  }
  if (removeVolume) {
    await runner.rmVolume(volumeNameFor(manifest.agent), connection);
  }
}
function spaceGatewayNeedsRepair(manifest, variables, runtime, allowedUsers) {
  const expected = {
    OPENCLAW_HF_STATE_BUCKET: manifest.bucket,
    MLCLAW_STATE_MOUNT_DIR: SPACE_STATE_MOUNT_DIR,
    OPENCLAW_LIVE_DIR: SPACE_LIVE_DIR,
    MLCLAW_RUNTIME_SETTINGS_FILE: `${SPACE_LIVE_DIR}/.mlclaw/settings.json`,
    OPENCLAW_MODEL: manifest.model,
    OPENCLAW_AGENT_NAME: manifest.agent,
    MLCLAW_GATEWAY_LOCATION: "space",
    MLCLAW_RUNTIME_IMAGE: manifest.runtimeImage,
    MLCLAW_RUNTIME_ID: spaceRuntimeId(manifest.agent),
    MLCLAW_ALLOWED_USERS: allowedUsers,
    MLCLAW_ADMINS: allowedUsers,
    MLCLAW_CANONICAL_SPACE_ID: DEFAULT_CANONICAL_TEMPLATE_SPACE,
    MLCLAW_OPENCLAW_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
    OPENCLAW_GATEWAY_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT)
  };
  return !variables.has("MLCLAW_TEMPLATE_REV") || Object.entries(expected).some(([key, value]) => variables.get(key)?.value !== value) || !hasStateVolume(runtime.volumes, manifest.bucket);
}
async function deploySpaceGateway(params) {
  const { hub, runtime, hfToken, manifest, secrets } = params;
  const assertLease = params.assertLease ?? (async () => void 0);
  if (!params.spacePrepared) {
    runtime.stdout.log(
      params.spaceExists ? `Updating existing Space ${manifest.space}` : `Creating ${params.publicSpace ? "public" : "private"} Space ${manifest.space}`
    );
    await assertLease();
    await hub.createDockerSpace(manifest.space, {
      private: !params.publicSpace,
      ...params.hardware && !params.spaceExists ? { hardware: params.hardware } : {},
      ...typeof params.sleepTime === "number" ? { sleepTimeSeconds: params.sleepTime } : {}
    });
  }
  if (params.hardware && params.spaceExists) {
    await assertLease();
    await hub.requestSpaceHardware(manifest.space, params.hardware, params.sleepTime);
  } else if (!params.hardware && params.spaceExists && typeof params.sleepTime === "number") {
    await assertLease();
    await hub.setSpaceSleepTime(manifest.space, params.sleepTime);
  }
  runtime.stdout.log(
    params.templateRuntimeImage ? "Generating Space files from prebuilt runtime image" : "Generating bundled Space runtime files"
  );
  await assertLease();
  const { templateRev } = await runtime.pushTemplateToSpace({
    targetRepo: manifest.space,
    token: hfToken,
    ...params.templateRuntimeImage ? { runtimeImage: params.templateRuntimeImage } : {}
  });
  const spaceRuntimeRef = params.templateRuntimeImage ?? bundledSpaceRuntimeRef(templateRev);
  await assertLease();
  await setDeploymentVariables(
    hub,
    manifest.space,
    {
      OPENCLAW_HF_STATE_BUCKET: manifest.bucket,
      MLCLAW_STATE_MOUNT_DIR: SPACE_STATE_MOUNT_DIR,
      OPENCLAW_LIVE_DIR: SPACE_LIVE_DIR,
      MLCLAW_RUNTIME_SETTINGS_FILE: `${SPACE_LIVE_DIR}/.mlclaw/settings.json`,
      ...secrets.OPENCLAW_HF_STATE_PREFIX ? { OPENCLAW_HF_STATE_PREFIX: secrets.OPENCLAW_HF_STATE_PREFIX } : {},
      MLCLAW_TEMPLATE_REV: templateRev,
      OPENCLAW_MODEL: manifest.model,
      OPENCLAW_AGENT_NAME: manifest.agent,
      MLCLAW_GATEWAY_LOCATION: "space",
      MLCLAW_RUNTIME_IMAGE: spaceRuntimeRef,
      MLCLAW_RUNTIME_ID: spaceRuntimeId(manifest.agent),
      MLCLAW_ALLOWED_USERS: params.allowedUsers,
      MLCLAW_ADMINS: params.allowedUsers,
      MLCLAW_CANONICAL_SPACE_ID: DEFAULT_CANONICAL_TEMPLATE_SPACE,
      MLCLAW_OPENCLAW_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
      OPENCLAW_GATEWAY_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT)
    },
    assertLease
  );
  await assertLease();
  await ensureSpaceStateVolume(hub, manifest.space, manifest.bucket, {
    allowMissingVolumes: !params.spaceExists,
    assertMutation: assertLease
  });
  await assertLease();
  await clearSpaceGatewayDisabled(hub, manifest.space);
  await assertLease();
  await setSpaceGatewaySecrets(hub, manifest.space, hfToken, secrets, assertLease);
  if (canDeleteBroadTokenSecrets({
    model: manifest.model,
    routerTokenPresent: hasBrokerOrRouterTokenSecretRecord(secrets)
  })) {
    await assertLease();
    await deleteStaleSpaceTokenSecrets(hub, manifest.space, assertLease);
  } else {
    runtime.stdout.log("Keeping legacy broad Hub token secrets until an HF Broker or Router credential is configured");
  }
  runtime.stdout.log(`Space deployment triggered: ${manifest.space}`);
  return { runtimeImage: spaceRuntimeRef };
}
async function startLocalGateway(params) {
  const { manifest, runtime } = params;
  const assertLease = params.assertLease ?? (async () => void 0);
  await refreshDirectNetworkAccess(manifest, runtime);
  if (manifest.networkAccess?.enabled) {
    assertLocalNetworkAccessHost(manifest);
  }
  let secrets = await ensureDeploymentCredentialKey(runtime, manifest.agent);
  if (!secrets.MLCLAW_SESSION_SECRET) {
    secrets = { ...secrets, MLCLAW_SESSION_SECRET: randomBytes(48).toString("base64url") };
    await writeSecretEnv(runtime.configRoot, manifest.agent, secrets);
  }
  const accessSecrets = localAccessSecrets(manifest.owner, localGatewayPort(manifest), secrets, manifest.networkAccess);
  if (Object.entries(accessSecrets).some(([key, value]) => secrets[key] !== value)) {
    secrets = { ...secrets, ...accessSecrets };
    await writeSecretEnv(runtime.configRoot, manifest.agent, secrets);
  }
  assertDedicatedRouterToken(manifest.model, secrets);
  const containerName = containerNameFor(manifest.agent);
  const volumeName = volumeNameFor(manifest.agent);
  const runner = localRunnerFor(manifest, runtime);
  const connection = localConnectionFor(manifest);
  const existing = "existing" in params ? params.existing : await runner.inspect(containerName, connection);
  const shouldRefresh = Boolean(params.refresh || params.resetVolume);
  if (existing?.running) {
    if (!shouldRefresh) {
      await assertLease();
      await syncNetworkAccess(manifest, runtime);
      runtime.stdout.log(`Local gateway already running: ${containerName}`);
      logLocalGatewayUrls(manifest, secrets, runtime);
      return;
    }
  }
  if (params.pull) {
    await assertLease();
    await runner.pull(manifest.runtimeImage, connection);
  }
  if (existing?.running) {
    await assertLease();
    await runner.stop(containerName, connection);
    runtime.stdout.log(`Local gateway stopped for config refresh: ${containerName}`);
  }
  if (existing) {
    await assertLease();
    await runner.rm(containerName, connection);
    runtime.stdout.log(`Local gateway removed for config refresh: ${containerName}`);
  }
  if (params.resetVolume) {
    await assertLease();
    await runner.rmVolume(volumeName, connection);
    runtime.stdout.log(`Local gateway volume reset for bucket restore: ${volumeName}`);
  }
  await assertLease();
  await runner.run({
    containerName,
    image: manifest.runtimeImage,
    envFile: secretEnvPath(runtime.configRoot, manifest.agent),
    volumeName,
    volumeMountPath: LOCAL_VOLUME_MOUNT_PATH,
    liveDir: LOCAL_LIVE_DIR,
    publishedPorts: publishedGatewayPorts(manifest),
    ...connection ? { context: connection } : {}
  });
  await runtime.sleep(LOCAL_START_SETTLE_MS);
  const started = await runner.inspect(containerName, connection);
  if (!started?.running) {
    throw new Error(`local gateway exited during startup. Inspect it with \`mlclaw gateway logs ${manifest.agent}\``);
  }
  await assertLease();
  await syncNetworkAccess(manifest, runtime);
  runtime.stdout.log(`Local gateway created: ${containerName}`);
  logLocalGatewayUrls(manifest, secrets, runtime);
}
async function stopLocalGateway(manifest, runtime) {
  try {
    await disableNetworkAccess(manifest, runtime);
  } catch (error) {
    runtime.stdout.log(
      `Tailscale Serve cleanup unavailable; the stopped gateway will not accept traffic (${error instanceof Error ? error.message : String(error)})`
    );
  }
  const containerName = containerNameFor(manifest.agent);
  const runner = localRunnerFor(manifest, runtime);
  const connection = localConnectionFor(manifest);
  const existing = await runner.inspect(containerName, connection);
  if (!existing) {
    runtime.stdout.log(`Local gateway does not exist: ${containerName}`);
    return;
  }
  if (!existing.running) {
    runtime.stdout.log(`Local gateway already stopped: ${containerName}`);
    return;
  }
  await runner.stop(containerName, connection);
  runtime.stdout.log(`Local gateway stopped: ${containerName}`);
}
async function gatewayStart(agent, opts, runtime) {
  const previousManifest = await readDeploymentManifest(runtime, agent, { requestedDockerContext: opts.dockerContext });
  let manifest = previousManifest;
  const requestedLocalPort = opts.localPort ?? localGatewayPort(manifest);
  const localPortChanged = manifest.gatewayLocation === "local" && manifest.localPort !== requestedLocalPort;
  if (localPortChanged) {
    manifest = { ...manifest, localPort: requestedLocalPort, updatedAt: runtime.now().toISOString() };
  }
  if (manifest.gatewayLocation === "local") {
    manifest = await resolveGatewayNetworkAccess(manifest, opts, runtime);
  }
  const bucketPrefix = await readDeploymentBucketPrefix(runtime, agent);
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  await assertNoLiveForeignLease({
    hub,
    bucket: manifest.bucket,
    bucketPrefix,
    runtimeId: runtimeIdFor(manifest),
    takeover: Boolean(opts.takeover)
  });
  const reconciled = await reconcileManifest({
    manifest,
    bucketPrefix,
    hub,
    runtime,
    apply: async ({ manifest: targetManifest, assertLease }) => {
      manifest = targetManifest;
      if (manifest.gatewayLocation === "local") {
        const previousSecrets = await readSecretEnv(runtime.configRoot, manifest.agent);
        const accessSecrets = localAccessSecrets(
          manifest.owner,
          localGatewayPort(manifest),
          previousSecrets,
          manifest.networkAccess
        );
        const accessSecretsChanged = Object.entries(accessSecrets).some(
          ([key, value]) => previousSecrets[key] !== value
        );
        const networkAccessChanged = JSON.stringify(previousManifest.networkAccess) !== JSON.stringify(manifest.networkAccess);
        const refresh = Boolean(opts.restart || localPortChanged || accessSecretsChanged || networkAccessChanged);
        const previousContainer = refresh ? await localRunnerFor(previousManifest, runtime).inspect(
          containerNameFor(previousManifest.agent),
          localConnectionFor(previousManifest)
        ) : void 0;
        const previousNetworkState = networkAccessChanged && previousManifest.networkAccess?.provider === "tailscale-serve" ? await runtime.tailscaleRunner.mappingState(networkAccessMapping(previousManifest.networkAccess)) : void 0;
        try {
          if (networkAccessChanged && previousNetworkState === "owned" && previousManifest.networkAccess) {
            await assertLease();
            await removeOwnedNetworkAccess(previousManifest.networkAccess, runtime);
          }
          if (accessSecretsChanged) {
            await assertLease();
            await writeSecretEnv(runtime.configRoot, manifest.agent, { ...previousSecrets, ...accessSecrets });
          }
          await assertLease();
          await startLocalGateway({
            manifest,
            runtime,
            pull: shouldPull(opts),
            refresh,
            assertLease,
            ...refresh ? { existing: previousContainer ?? null } : {}
          });
        } catch (error) {
          if (accessSecretsChanged) {
            await writeSecretEnv(runtime.configRoot, manifest.agent, previousSecrets);
          }
          try {
            if (networkAccessChanged && manifest.networkAccess) {
              await disableNetworkAccess(manifest, runtime);
            }
            if (previousContainer?.running) {
              await assertLease();
              await startLocalGateway({
                manifest: previousManifest,
                runtime,
                pull: false,
                refresh: true,
                assertLease
              });
              runtime.stdout.log(`Previous local gateway restored: ${containerNameFor(previousManifest.agent)}`);
            } else if (previousContainer) {
              await assertLease();
              await startLocalGateway({ manifest: previousManifest, runtime, pull: false, refresh: true, assertLease });
              await localRunnerFor(previousManifest, runtime).stop(
                containerNameFor(previousManifest.agent),
                localConnectionFor(previousManifest)
              );
              runtime.stdout.log(
                `Previous stopped local gateway restored: ${containerNameFor(previousManifest.agent)}`
              );
            } else {
              await removeFailedBootstrapContainer(manifest, runtime, false);
            }
            if (previousNetworkState === "owned" && previousManifest.networkAccess) {
              await runtime.tailscaleRunner.ensureMapping(networkAccessMapping(previousManifest.networkAccess));
            }
          } catch (rollbackError) {
            throw new AggregateError([error, rollbackError], "local gateway update and rollback both failed");
          }
          throw error;
        }
        await writeManifest(runtime.configRoot, manifest);
      } else {
        await assertLease();
        await clearSpaceGatewayDisabled(hub, manifest.space);
        await assertLease();
        await hub.restartSpace(manifest.space, true);
        runtime.stdout.log(`Space gateway restart requested: ${manifest.space}`);
      }
    }
  });
  manifest = reconciled.manifest;
}
async function gatewayRestart(agent, opts, runtime) {
  const manifest = await readDeploymentManifest(runtime, agent, { requestedDockerContext: opts.dockerContext });
  if (manifest.gatewayLocation === "local") {
    assertDedicatedRouterToken(manifest.model, await readSecretEnv(runtime.configRoot, agent).catch(() => ({})));
  }
  await gatewayStart(agent, { ...opts, restart: true }, runtime);
}
async function gatewayStop(agent, runtime) {
  const manifest = await readDeploymentManifest(runtime, agent);
  const bucketPrefix = await readDeploymentBucketPrefix(runtime, agent);
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  await reconcileManifest({
    manifest,
    bucketPrefix,
    hub,
    runtime,
    apply: async ({ manifest: targetManifest, assertLease }) => {
      await assertLease();
      if (targetManifest.gatewayLocation === "local") {
        await stopLocalGateway(targetManifest, runtime);
        return;
      }
      await disableAndPauseSpaceGateway({ manifest: targetManifest, hub, runtime, bucketPrefix });
    }
  });
}
async function gatewayStatus(agent, runtime) {
  const manifest = await readDeploymentManifest(runtime, agent);
  const bucketPrefix = await readDeploymentBucketPrefix(runtime, agent);
  runtime.stdout.log(`Agent: ${manifest.agent}`);
  runtime.stdout.log(`Gateway: ${manifest.gatewayLocation}`);
  runtime.stdout.log(`Bucket: ${manifest.bucket}`);
  runtime.stdout.log(`Space: ${manifest.space}`);
  if (manifest.gatewayLocation === "local") {
    const secrets = await readSecretEnv(runtime.configRoot, manifest.agent).catch(() => ({}));
    if (manifest.localGateway) {
      runtime.stdout.log(`Container: ${localGatewayLabel(manifest.localGateway)}`);
      const endpoint = localGatewayEndpoint(manifest.localGateway);
      if (endpoint) {
        runtime.stdout.log(`Endpoint: ${endpoint}`);
      }
    }
    runtime.stdout.log(`Gateway URL: ${localGatewayAccessUrl(manifest, secrets)}`);
    if (manifest.networkAccess?.enabled && !networkAccessPendingApproval(manifest.networkAccess)) {
      runtime.stdout.log(`Tailnet URL: ${networkAccessUrl(manifest.networkAccess, manifest.agent, secrets)}`);
      if (manifest.networkAccess.provider === "tailscale-direct") {
        runtime.stdout.log(`Tailscale direct: ${manifest.networkAccess.ipv4}:${manifest.networkAccess.port}`);
      } else {
        try {
          runtime.stdout.log(
            `Tailscale Serve: ${await runtime.tailscaleRunner.mappingState(networkAccessMapping(manifest.networkAccess))}`
          );
        } catch (error) {
          runtime.stdout.log(
            `Tailscale Serve: unavailable (${error instanceof Error ? error.message : String(error)})`
          );
        }
      }
    } else if (manifest.networkAccess && networkAccessPendingApproval(manifest.networkAccess)) {
      runtime.stdout.log("Tailscale Serve: pending administrator approval");
    }
    runtime.stdout.log(localGatewayRemoteAccess(manifest));
    const inspect = await localRunnerFor(manifest, runtime).inspect(
      containerNameFor(manifest.agent),
      localConnectionFor(manifest)
    );
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
    const lease = await readRuntimeLease(hub, manifest.bucket, bucketPrefix);
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
  const manifest = await readDeploymentManifest(runtime, agent);
  if (manifest.gatewayLocation === "local") {
    runtime.stdout.log(
      await localRunnerFor(manifest, runtime).logs(
        containerNameFor(manifest.agent),
        opts.tail,
        localConnectionFor(manifest)
      )
    );
    return;
  }
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  runtime.stdout.log(await hub.fetchSpaceLogs(manifest.space, "run"));
}
async function gatewayMigrate(agent, opts, runtime) {
  const target = parseGatewayLocation(requiredOption(opts.to, "--to"));
  if (target === "space" && (opts.tailscale !== void 0 || opts.tailscalePort !== void 0)) {
    throw new Error("Tailscale Serve access only applies when migrating to a local gateway");
  }
  const requestedContainerRuntime = target === "local" ? parseContainerRuntimePreference(opts.containerRuntime) : void 0;
  if (target === "local" && opts.dockerContext && requestedContainerRuntime === "podman") {
    throw new Error("--docker-context cannot be used with --container-runtime podman");
  }
  const current = await readDeploymentManifest(runtime, agent, {
    requestedDockerContext: target === "space" ? opts.dockerContext : void 0
  });
  if (current.gatewayLocation === target) {
    runtime.stdout.log(`Gateway already uses ${target}`);
    return;
  }
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  const secrets = await ensureDeploymentCredentialKey(runtime, agent);
  const bucketPrefix = persistedBucketPrefix(secrets);
  let updated = {
    ...current,
    gatewayLocation: target,
    runtimeImage: resolveRuntimeImage(opts.runtimeImage ?? current.runtimeImage, runtime.env),
    updatedAt: runtime.now().toISOString(),
    ...target === "local" ? { localPort: opts.localPort ?? current.localPort ?? DEFAULT_LOCAL_PORT } : {},
    ...target === "space" && current.networkAccess ? { networkAccess: { ...current.networkAccess, enabled: false } } : {}
  };
  const routerToken = await resolveRouterToken({
    opts,
    runtime,
    existingSecrets: secrets,
    model: updated.model
  });
  if (target === "space") {
    const deploymentSecrets2 = {
      ...secrets,
      MLCLAW_GATEWAY_LOCATION: "space",
      MLCLAW_RUNTIME_IMAGE: updated.runtimeImage,
      ...routerToken ? { MLCLAW_ROUTER_TOKEN: routerToken } : {}
    };
    const paidHardware = await resolveHardware({
      ...opts.hardware ? { requestedHardware: opts.hardware } : {},
      ...typeof opts.sleepTime === "number" ? { requestedSleepTime: opts.sleepTime } : secrets.TELEGRAM_BOT_TOKEN ? { requestedSleepTime: TELEGRAM_SLEEP_TIME } : {},
      defaultLabel: "unchanged Space hardware",
      requiresMessagingEgress: Boolean(secrets.TELEGRAM_BOT_TOKEN),
      yes: Boolean(opts.yes),
      runtime
    });
    updated = {
      ...updated,
      spaceVisibility: opts.publicSpace ? "public" : current.spaceVisibility ?? "private",
      ...paidHardware.kind === "explicit" ? { spaceHardware: paidHardware.hardware } : {},
      ...typeof paidHardware.sleepTime === "number" ? { spaceSleepTime: paidHardware.sleepTime } : {}
    };
    await assertNoLiveForeignLease({
      hub,
      bucket: current.bucket,
      bucketPrefix,
      runtimeId: current.localRuntimeId,
      takeover: Boolean(opts.takeover)
    });
    const me2 = await hub.whoami();
    const templateRuntimeImage = resolveSpaceRuntimeImage(opts, runtime.env);
    const spaceExists = await hub.spaceExists(updated.space);
    const reconciled = await reconcileManifest({
      manifest: updated,
      bucketPrefix,
      hub,
      runtime,
      apply: async ({ manifest: targetManifest, assertLease }) => {
        updated = targetManifest;
        await assertLease();
        await handoffAndStopLocalGateway({ manifest: current, hub, runtime, bucketPrefix });
        await assertLease();
        await deploySpaceGateway({
          hub,
          runtime,
          hfToken: token,
          manifest: updated,
          secrets: deploymentSecrets2,
          allowedUsers: me2.name,
          publicSpace: updated.spaceVisibility === "public",
          spaceExists,
          assertLease,
          ...paidHardware.kind === "explicit" ? { hardware: paidHardware.hardware } : {},
          ...typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {},
          ...templateRuntimeImage ? { templateRuntimeImage } : {}
        });
        await assertLease();
        await writeSecretEnv(runtime.configRoot, agent, {
          ...deploymentSecrets2,
          MLCLAW_GATEWAY_LOCATION: "space",
          MLCLAW_RUNTIME_IMAGE: updated.runtimeImage,
          MLCLAW_RUNTIME_ID: spaceRuntimeId(agent)
        });
        await writeManifest(runtime.configRoot, updated);
      }
    });
    updated = reconciled.manifest;
  } else {
    const containerRuntime = requestedContainerRuntime ?? "auto";
    const reuseLocalBinding = !opts.dockerContext && (containerRuntime === "auto" || current.localGateway?.engine === containerRuntime);
    updated.localGateway = await resolveLocalGatewayBinding({
      manifest: reuseLocalBinding && current.localGateway ? current : void 0,
      requestedContext: opts.dockerContext,
      preference: containerRuntime,
      runtime,
      persist: false,
      agent: current.agent
    });
    updated = await resolveGatewayNetworkAccess(updated, opts, runtime);
    await assertNoLiveForeignLease({
      hub,
      bucket: current.bucket,
      bucketPrefix,
      runtimeId: updated.localRuntimeId,
      allowedRuntimeIds: [spaceRuntimeId(current.agent)],
      takeover: Boolean(opts.takeover)
    });
    const reconciled = await reconcileManifest({
      manifest: updated,
      bucketPrefix,
      hub,
      runtime,
      apply: async ({ manifest: targetManifest, assertLease }) => {
        updated = targetManifest;
        await assertLease();
        await disableAndPauseSpaceGateway({ manifest: current, hub, runtime, bucketPrefix });
        await assertLease();
        await assertNoLiveForeignLease({
          hub,
          bucket: current.bucket,
          bucketPrefix,
          runtimeId: updated.localRuntimeId,
          allowedRuntimeIds: [spaceRuntimeId(current.agent)],
          takeover: Boolean(opts.takeover)
        });
        await assertLease();
        await writeSecretEnv(runtime.configRoot, agent, {
          ...secrets,
          ...routerToken ? { MLCLAW_ROUTER_TOKEN: routerToken } : {},
          MLCLAW_GATEWAY_LOCATION: "local",
          MLCLAW_RUNTIME_IMAGE: updated.runtimeImage,
          MLCLAW_RUNTIME_ID: updated.localRuntimeId,
          ...localAccessSecrets(updated.owner, localGatewayPort(updated), secrets, updated.networkAccess)
        });
        await assertLease();
        await startLocalGateway({
          manifest: updated,
          runtime,
          pull: shouldPull(opts),
          resetVolume: true,
          assertLease
        });
        await writeManifest(runtime.configRoot, updated);
      }
    });
    updated = reconciled.manifest;
  }
  runtime.stdout.log(`Gateway migrated to ${target}`);
}
async function gatewayRebind(agent, opts, runtime) {
  const targetContext = requiredOption(opts.dockerContext, "--docker-context").trim();
  const current = await readDeploymentManifest(runtime, agent, { validateLocalGateway: false });
  if (current.gatewayLocation !== "local") {
    throw new Error("Docker context rebind only applies to local gateway deployments");
  }
  assertDedicatedRouterToken(current.model, await readSecretEnv(runtime.configRoot, agent).catch(() => ({})));
  const targetBinding = await resolveLocalGatewayBinding({
    manifest: void 0,
    requestedContext: targetContext,
    runtime,
    persist: false,
    agent
  });
  if (targetBinding.engine !== "docker") {
    throw new Error("internal error: Docker rebind resolved a non-Docker runtime");
  }
  if (current.localGateway?.engine === "podman") {
    throw new Error("Docker context rebind cannot move a Podman deployment; migrate the gateway through Space first");
  }
  const currentContext = current.localGateway?.dockerContext;
  if (currentContext === targetBinding.dockerContext) {
    runtime.stdout.log(`Local gateway already uses Docker context ${targetBinding.dockerContext}`);
    return;
  }
  const updated = {
    ...current,
    localGateway: targetBinding,
    updatedAt: runtime.now().toISOString()
  };
  if (updated.networkAccess?.enabled) {
    assertLocalNetworkAccessHost(updated);
  }
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  const bucketPrefix = await readDeploymentBucketPrefix(runtime, agent);
  await reconcileManifest({
    manifest: updated,
    bucketPrefix,
    hub,
    runtime,
    apply: async ({ manifest: targetManifest, assertLease }) => {
      if (currentContext && await runtime.dockerRunner.contextExists(currentContext)) {
        try {
          await assertLease();
          await handoffAndStopLocalGateway({
            manifest: current,
            hub,
            runtime,
            bucketPrefix,
            targetRuntimeId: current.localRuntimeId
          });
        } catch (err) {
          if (!opts.takeover) {
            throw err;
          }
          await clearRuntimeHandoffRequest(hub, current.bucket, bucketPrefix).catch(() => void 0);
          await assertLease();
          await stopLocalGateway(current, runtime);
          runtime.stdout.log(
            `Old Docker context handoff failed; rebinding with --takeover: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      } else if (!opts.takeover) {
        const missing = currentContext ? `Docker context ${currentContext} is not available` : "Deployment has no pinned Docker context";
        throw new Error(`${missing}. Run with --takeover to rebind without a final snapshot from the old context.`);
      } else {
        runtime.stdout.log(
          "Old Docker context unavailable; rebinding with --takeover and using the latest bucket snapshot."
        );
      }
      await assertLease();
      await startLocalGateway({
        manifest: targetManifest,
        runtime,
        pull: shouldPull(opts),
        resetVolume: true,
        assertLease
      });
      await writeManifest(runtime.configRoot, targetManifest);
    }
  });
  runtime.stdout.log(`Local gateway rebound to Docker context ${targetBinding.dockerContext}`);
}
async function readDeploymentManifest(runtime, agent, opts = {}) {
  const manifest = await readManifest(runtime.configRoot, agent);
  let updated = manifest.localRuntimeId ? manifest : {
    ...manifest,
    localRuntimeId: newLocalRuntimeId(manifest.agent),
    updatedAt: runtime.now().toISOString()
  };
  if (updated.gatewayLocation === "local" && opts.validateLocalGateway !== false) {
    const localGateway = await resolveLocalGatewayBinding({
      manifest: updated,
      requestedContext: opts.requestedDockerContext,
      runtime,
      persist: false,
      agent: updated.agent
    });
    if (!sameLocalGatewayBinding(updated.localGateway, localGateway)) {
      updated = {
        ...updated,
        localGateway,
        updatedAt: runtime.now().toISOString()
      };
    }
  } else if (opts.requestedDockerContext) {
    throw new Error("--docker-context only applies when the local gateway is used");
  }
  if (updated !== manifest) {
    await writeManifest(runtime.configRoot, updated);
  }
  return updated;
}
async function resolveLocalGatewayBinding(params) {
  const requestedContext = params.requestedContext?.trim();
  const existing = params.manifest?.localGateway;
  const agent = params.agent ?? params.manifest?.agent ?? "deployment";
  if (existing && params.preference && params.preference !== "auto" && existing.engine !== params.preference) {
    throw new Error(`local gateway ${agent} is pinned to ${displayContainerEngine(existing.engine)}`);
  }
  if (existing?.engine === "podman" && requestedContext) {
    throw new Error("--docker-context cannot be used with a Podman local gateway");
  }
  if (existing?.engine === "docker" && requestedContext && existing.dockerContext !== requestedContext) {
    throw new Error(
      `local gateway ${agent} is pinned to Docker context ${existing.dockerContext}. Run \`mlclaw gateway rebind ${agent} --docker-context ${requestedContext}\` to move it.`
    );
  }
  const binding = existing ? await probeExistingLocalGateway(existing, params.runtime) : await selectLocalGatewayBinding({
    preference: params.preference ?? "auto",
    ...requestedContext ? { requestedDockerContext: requestedContext } : {},
    runtime: params.runtime
  });
  if (binding.engine === "docker" && existing) {
    await warnOnDockerContextMismatch(binding.dockerContext, params.runtime);
  }
  if (params.persist && params.manifest && !sameLocalGatewayBinding(params.manifest.localGateway, binding)) {
    await writeManifest(params.runtime.configRoot, {
      ...params.manifest,
      localGateway: binding,
      updatedAt: params.runtime.now().toISOString()
    });
  }
  return binding;
}
async function warnOnDockerContextMismatch(pinnedContext, runtime) {
  const currentContext = await runtime.dockerRunner.currentContext().catch(() => void 0);
  if (currentContext && currentContext !== pinnedContext) {
    runtime.stdout.log(
      `Using Docker context ${pinnedContext} from the deployment manifest. Current shell context is ${currentContext}.`
    );
  }
}
function sameLocalGatewayBinding(a, b2) {
  return JSON.stringify(a) === JSON.stringify(b2);
}
function localConnectionFor(manifest) {
  const binding = manifest.localGateway;
  if (!binding) {
    return void 0;
  }
  return binding.engine === "docker" ? binding.dockerContext : binding.podmanConnection;
}
function localRunnerFor(manifest, runtime) {
  return runnerForEngine(manifest.localGateway?.engine ?? "docker", runtime);
}
function parseContainerRuntimePreference(value) {
  const normalized = value?.trim().toLowerCase() || "auto";
  if (normalized === "auto" || normalized === "docker" || normalized === "podman") {
    return normalized;
  }
  throw new InvalidArgumentError(`expected container runtime auto, docker, or podman; got ${value}`);
}
function displayContainerEngine(engine) {
  return engine === "docker" ? "Docker" : "Podman";
}
function runnerForEngine(engine, runtime) {
  return engine === "docker" ? runtime.dockerRunner : runtime.podmanRunner;
}
function localGatewayLabel(binding) {
  return binding.engine === "docker" ? `Docker context ${binding.dockerContext}` : binding.podmanConnection === "local" ? "Podman default connection" : `Podman connection ${binding.podmanConnection}`;
}
function localGatewayEndpoint(binding) {
  return binding.engine === "docker" ? binding.dockerEndpoint : binding.podmanEndpoint;
}
function localGatewayPort(manifest) {
  return manifest.localPort ?? DEFAULT_LOCAL_PORT;
}
function publishedGatewayPorts(manifest) {
  const port = localGatewayPort(manifest);
  return [
    { hostAddress: "127.0.0.1", hostPort: port, containerPort: DEFAULT_LOCAL_PORT },
    ...manifest.networkAccess?.provider === "tailscale-direct" && manifest.networkAccess.enabled ? [
      {
        hostAddress: manifest.networkAccess.ipv4,
        hostPort: manifest.networkAccess.port,
        containerPort: DEFAULT_LOCAL_PORT
      }
    ] : []
  ];
}
function networkAccessMode(binding) {
  if (!binding?.enabled) return void 0;
  return binding.provider === "tailscale-direct" ? "direct" : "serve";
}
function networkAccessPendingApproval(binding) {
  return binding.provider === "tailscale-serve" && binding.pendingApproval === true;
}
async function refreshDirectNetworkAccess(manifest, runtime) {
  const binding = manifest.networkAccess;
  if (binding?.provider !== "tailscale-direct" || !binding.enabled) return;
  assertLocalNetworkAccessHost(manifest);
  const discovery = await runtime.tailscaleRunner.discover();
  if (!discovery.ready) throw new Error(discovery.reason);
  manifest.networkAccess = {
    provider: "tailscale-direct",
    enabled: true,
    ipv4: discovery.ipv4,
    ...discovery.dnsName ? { dnsName: discovery.dnsName } : {},
    port: binding.port,
    accessOrigin: `http://${discovery.ipv4}:${binding.port}`
  };
}
function networkAccessPort(binding) {
  if (!binding) return void 0;
  return binding.provider === "tailscale-direct" ? binding.port : binding.httpsPort;
}
function localGatewayUrl(manifest) {
  return `http://127.0.0.1:${localGatewayPort(manifest)}`;
}
function localGatewayAccessUrl(manifest, secrets) {
  return localAccessUrl(localGatewayUrl(manifest), manifest.agent, secrets);
}
function networkAccessUrl(networkAccess, agent, secrets) {
  return localAccessUrl(networkAccess.accessOrigin, agent, secrets);
}
function localAccessUrl(origin, agent, secrets) {
  const sessionSecret = secrets.MLCLAW_SESSION_SECRET;
  if (!sessionSecret) {
    return `${origin}/mlclaw/local-login (run mlclaw gateway restart ${agent} to initialize local access)`;
  }
  const token = deriveLocalAccessToken(sessionSecret);
  return `${origin}/mlclaw/local-login#${token}`;
}
function logLocalGatewayUrls(manifest, secrets, runtime) {
  runtime.stdout.log(`Gateway URL: ${localGatewayAccessUrl(manifest, secrets)}`);
  if (manifest.networkAccess?.enabled && !networkAccessPendingApproval(manifest.networkAccess)) {
    runtime.stdout.log(`Tailnet URL: ${networkAccessUrl(manifest.networkAccess, manifest.agent, secrets)}`);
  }
}
function localGatewayAccessSummary(manifest, secrets) {
  const lines = ["Open the gateway on this machine:", "", localGatewayAccessUrl(manifest, secrets)];
  if (manifest.networkAccess?.enabled && !networkAccessPendingApproval(manifest.networkAccess)) {
    lines.push(
      "",
      "Open it from another device on your tailnet:",
      "",
      networkAccessUrl(manifest.networkAccess, manifest.agent, secrets)
    );
  }
  lines.push("", localGatewayRemoteAccess(manifest));
  return lines.join("\n");
}
function networkAccessMapping(binding) {
  if (binding.provider !== "tailscale-serve") throw new Error("direct tailnet access has no Serve mapping");
  return {
    dnsName: binding.dnsName,
    httpsPort: binding.httpsPort,
    target: binding.target
  };
}
async function syncNetworkAccess(manifest, runtime) {
  const binding = manifest.networkAccess;
  if (!binding) {
    return;
  }
  if (!binding.enabled) {
    await disableNetworkAccess(manifest, runtime);
    return;
  }
  if (binding.provider === "tailscale-direct") {
    runtime.stdout.log(`Tailscale direct listener ready: ${binding.accessOrigin}`);
    return;
  }
  const result = await runtime.tailscaleRunner.ensureMapping(networkAccessMapping(binding));
  if (binding.pendingApproval) {
    delete binding.pendingApproval;
    await writeManifest(runtime.configRoot, manifest);
  }
  runtime.stdout.log(`Tailscale Serve ${result}: ${binding.accessOrigin}`);
}
async function disableNetworkAccess(manifest, runtime) {
  const binding = manifest.networkAccess;
  if (!binding || binding.provider === "tailscale-direct") {
    return;
  }
  const result = await runtime.tailscaleRunner.removeMapping(networkAccessMapping(binding));
  if (result === "drifted") {
    runtime.stdout.log(
      `Tailscale Serve mapping drifted on HTTPS port ${binding.httpsPort}; preserving the unrelated live handler`
    );
  } else if (result === "removed") {
    runtime.stdout.log(`Tailscale Serve disabled: ${binding.accessOrigin}`);
  }
}
async function removeOwnedNetworkAccess(binding, runtime) {
  if (binding.provider === "tailscale-direct") return;
  const result = await runtime.tailscaleRunner.removeMapping(networkAccessMapping(binding));
  if (result !== "removed" && result !== "missing") {
    throw new Error(`Tailscale Serve mapping changed on HTTPS port ${binding.httpsPort}; preserving the live handler`);
  }
}
async function resolveGatewayNetworkAccess(manifest, opts, runtime) {
  const existing = manifest.networkAccess;
  if (opts.tailscale === void 0 && opts.tailscalePort === void 0 && !existing?.enabled && (!manifest.tailscaleMode || manifest.tailscaleMode === "off")) {
    return manifest;
  }
  const mode = opts.tailscale ?? manifest.tailscaleMode ?? networkAccessMode(existing) ?? "off";
  if (mode === "off") {
    if (opts.tailscalePort !== void 0) throw new Error("--tailscale-port cannot be used with --tailscale=off");
    const { networkAccess: _removed, ...base } = manifest;
    return { ...base, tailscaleMode: "off", updatedAt: runtime.now().toISOString() };
  }
  assertLocalNetworkAccessHost(manifest);
  const discovery = await runtime.tailscaleRunner.discover();
  if (!discovery.ready) {
    throw new Error(discovery.reason);
  }
  const port = opts.tailscalePort ?? networkAccessPort(existing) ?? localGatewayPort(manifest);
  if (mode === "direct") {
    return {
      ...manifest,
      tailscaleMode: "direct",
      networkAccess: {
        provider: "tailscale-direct",
        enabled: true,
        ipv4: discovery.ipv4,
        ...discovery.dnsName ? { dnsName: discovery.dnsName } : {},
        port,
        accessOrigin: `http://${discovery.ipv4}:${port}`
      },
      updatedAt: runtime.now().toISOString()
    };
  }
  if (!discovery.dnsName) throw new Error("Tailscale MagicDNS is required for Serve mode");
  const mapping = {
    dnsName: discovery.dnsName,
    httpsPort: port,
    target: localGatewayUrl(manifest)
  };
  const state = await runtime.tailscaleRunner.mappingState(mapping);
  if (state === "conflict") {
    throw new Error(`Tailscale Serve HTTPS port ${port} is already in use; choose --tailscale-port`);
  }
  return {
    ...manifest,
    tailscaleMode: "serve",
    networkAccess: {
      provider: "tailscale-serve",
      enabled: true,
      ...mapping,
      accessOrigin: tailscaleAccessOrigin(mapping)
    },
    updatedAt: runtime.now().toISOString()
  };
}
function assertLocalNetworkAccessHost(manifest) {
  const endpoint = manifest.localGateway ? localGatewayEndpoint(manifest.localGateway) : void 0;
  if (endpoint && !endpoint.startsWith("unix:") && !endpoint.startsWith("npipe:") && !endpointIsLoopback(endpoint)) {
    throw new Error("Tailscale Serve access requires the container runtime to run on this machine");
  }
}
function localGatewayRemoteAccess(manifest) {
  const command = localGatewayTunnelCommand(manifest);
  return command ? `Remote access: ${command}` : `Remote access: forward 127.0.0.1:${localGatewayPort(manifest)} from the container host, then open the gateway URL above.`;
}
function localGatewayTunnelCommand(manifest) {
  const port = localGatewayPort(manifest);
  const endpoint = manifest.localGateway ? localGatewayEndpoint(manifest.localGateway) : void 0;
  if (!endpoint || endpoint.startsWith("unix:") || endpoint.startsWith("npipe:") || endpointIsLoopback(endpoint)) {
    return `ssh -N -L ${port}:127.0.0.1:${port} ${os8.userInfo().username}@${os8.hostname()}`;
  }
  if (!endpoint.startsWith("ssh://")) {
    return void 0;
  }
  const target = new URL(endpoint);
  const destination = `${target.username ? `${target.username}@` : ""}${target.hostname}`;
  return `ssh ${target.port ? `-p ${target.port} ` : ""}-N -L ${port}:127.0.0.1:${port} ${destination}`;
}
function endpointIsLoopback(endpoint) {
  try {
    const hostname = new URL(endpoint).hostname;
    return hostname === "127.0.0.1" || hostname === "::1" || hostname === "localhost";
  } catch {
    return false;
  }
}
async function probeExistingLocalGateway(binding, runtime) {
  const runner = runnerForEngine(binding.engine, runtime);
  const connection = binding.engine === "docker" ? binding.dockerContext : binding.podmanConnection;
  const probe = await runner.probe(connection);
  if (probe.status !== "ready") {
    throw new Error(`${localGatewayLabel(binding)} is not ready: ${probe.detail}`);
  }
  return bindingFromProbe(probe);
}
async function selectLocalGatewayBinding(params) {
  const engines = params.requestedDockerContext ? ["docker"] : params.preference === "auto" ? ["docker", "podman"] : [params.preference];
  const probes = [];
  for (const engine of engines) {
    const runner = runnerForEngine(engine, params.runtime);
    const probe = await runner.probe(engine === "docker" ? params.requestedDockerContext : void 0);
    probes.push(probe);
    if (probe.status === "ready") {
      return bindingFromProbe(probe);
    }
  }
  throw new Error(`no usable local container runtime found. ${probes.map((probe) => probe.detail).join("; ")}`);
}
function bindingFromProbe(probe) {
  if (probe.status !== "ready") {
    throw new Error(`container runtime is not ready: ${probe.detail}`);
  }
  if (probe.engine === "docker") {
    if (!probe.context) {
      throw new Error("Docker readiness probe did not report its context");
    }
    return {
      engine: "docker",
      dockerContext: probe.context,
      ...probe.endpoint ? { dockerEndpoint: probe.endpoint } : {}
    };
  }
  return {
    engine: "podman",
    podmanConnection: probe.context ?? "local",
    ...probe.endpoint ? { podmanEndpoint: probe.endpoint } : {}
  };
}
async function readDeploymentBucketPrefix(runtime, agent) {
  const secrets = await readSecretEnv(runtime.configRoot, agent).catch(() => ({}));
  return persistedBucketPrefix(secrets);
}
function bootstrapBucketPrefix(existingManifest, secrets, runtime) {
  return persistedBucketPrefix(secrets) ?? (existingManifest ? void 0 : envBucketPrefix(runtime));
}
function persistedBucketPrefix(secrets) {
  return nonEmpty(secrets.OPENCLAW_HF_STATE_PREFIX);
}
function envBucketPrefix(runtime) {
  return nonEmpty(runtime.env.OPENCLAW_HF_STATE_PREFIX);
}
function nonEmpty(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : void 0;
}
function newLocalRuntimeId(agent) {
  return `local-${agent}-${randomBytes(8).toString("hex")}`;
}
function runtimeIdFor(manifest) {
  return manifest.gatewayLocation === "local" ? manifest.localRuntimeId : spaceRuntimeId(manifest.agent);
}
function spaceRuntimeId(agent) {
  return `space-${agent}`;
}
async function handoffAndStopLocalGateway(params) {
  const containerName = containerNameFor(params.manifest.agent);
  const runner = localRunnerFor(params.manifest, params.runtime);
  const connection = localConnectionFor(params.manifest);
  const existing = await runner.inspect(containerName, connection);
  if (!existing) {
    params.runtime.stdout.log(`Local gateway does not exist: ${containerName}`);
    return;
  }
  if (!existing.running) {
    params.runtime.stdout.log(`Local gateway already stopped: ${containerName}`);
    return;
  }
  await runner.disableRestart(containerName, connection);
  const handoffStartedAt = params.runtime.now();
  const requestId = randomBytes(16).toString("hex");
  await writeRuntimeHandoffRequest(
    params.hub,
    params.manifest.bucket,
    {
      schemaVersion: 1,
      requestId,
      agent: params.manifest.agent,
      runtimeId: params.manifest.localRuntimeId,
      requestedAt: handoffStartedAt.toISOString(),
      targetRuntimeId: params.targetRuntimeId ?? spaceRuntimeId(params.manifest.agent)
    },
    params.bucketPrefix
  );
  params.runtime.stdout.log("Waiting for local gateway to upload a final snapshot");
  await waitForRuntimeHandoffAck({
    hub: params.hub,
    bucket: params.manifest.bucket,
    bucketPrefix: params.bucketPrefix,
    requestId,
    runtimeId: params.manifest.localRuntimeId,
    timeoutMs: SPACE_HANDOFF_TIMEOUT_MS,
    pollMs: SPACE_HANDOFF_POLL_MS
  });
  await clearRuntimeHandoffRequest(params.hub, params.manifest.bucket, params.bucketPrefix).catch(() => void 0);
  params.runtime.stdout.log("Local final snapshot observed");
  await stopLocalGateway(params.manifest, params.runtime);
}
async function disableAndPauseSpaceGateway(params) {
  const handoffStartedAt = params.runtime.now();
  const requestId = randomBytes(16).toString("hex");
  const shouldWaitForHandoff = await spaceGatewayShouldWaitForHandoff(params);
  if (!shouldWaitForHandoff) {
    await params.hub.addSpaceVariable(params.manifest.space, "MLCLAW_GATEWAY_DISABLED", "1");
    await clearRuntimeHandoffRequest(params.hub, params.manifest.bucket, params.bucketPrefix).catch(() => void 0);
    await params.hub.pauseSpace(params.manifest.space);
    params.runtime.stdout.log(`Space pause requested: ${params.manifest.space}`);
    return;
  }
  await writeRuntimeHandoffRequest(
    params.hub,
    params.manifest.bucket,
    {
      schemaVersion: 1,
      requestId,
      agent: params.manifest.agent,
      runtimeId: spaceRuntimeId(params.manifest.agent),
      requestedAt: handoffStartedAt.toISOString(),
      targetRuntimeId: params.targetRuntimeId ?? params.manifest.localRuntimeId
    },
    params.bucketPrefix
  );
  await params.hub.addSpaceVariable(params.manifest.space, "MLCLAW_GATEWAY_DISABLED", "1");
  params.runtime.stdout.log("Waiting for Space gateway to upload a final snapshot");
  await waitForRuntimeHandoffAck({
    hub: params.hub,
    bucket: params.manifest.bucket,
    bucketPrefix: params.bucketPrefix,
    requestId,
    runtimeId: spaceRuntimeId(params.manifest.agent),
    timeoutMs: SPACE_HANDOFF_TIMEOUT_MS,
    pollMs: SPACE_HANDOFF_POLL_MS
  });
  await clearRuntimeHandoffRequest(params.hub, params.manifest.bucket, params.bucketPrefix).catch(() => void 0);
  params.runtime.stdout.log("Space final snapshot observed");
  await params.hub.pauseSpace(params.manifest.space);
  params.runtime.stdout.log(`Space pause requested: ${params.manifest.space}`);
}
async function spaceGatewayShouldWaitForHandoff(params) {
  const expectedRuntimeId = spaceRuntimeId(params.manifest.agent);
  const [runtimeInfo, lease] = await Promise.all([
    params.hub.getSpaceRuntime(params.manifest.space).catch(() => null),
    readRuntimeLease(params.hub, params.manifest.bucket, params.bucketPrefix)
  ]);
  const stage = typeof runtimeInfo?.stage === "string" ? runtimeInfo.stage.toUpperCase() : "";
  const stageCanRunGateway = !stage || stage === "RUNNING" || stage === "RUNNING_BUILDING";
  const leaseIsCurrentSpace = lease?.runtimeId === expectedRuntimeId && lease.gatewayLocation === "space" && runtimeLeaseIsLive(lease, params.runtime.now());
  if (stageCanRunGateway || leaseIsCurrentSpace) {
    if (stageCanRunGateway && !leaseIsCurrentSpace) {
      const leaseDetail2 = lease ? `last lease is ${lease.gatewayLocation}/${lease.runtimeId} at ${lease.lastHeartbeatAt}` : "no runtime lease found";
      params.runtime.stdout.log(
        `Space may still be running (${stage || "unknown"}; ${leaseDetail2}); waiting for final snapshot handoff.`
      );
    }
    return true;
  }
  const stageDetail = stage ? `Space stage: ${stage}. ` : "";
  const leaseDetail = lease ? `Last lease: ${lease.gatewayLocation}/${lease.runtimeId} at ${lease.lastHeartbeatAt}.` : "No runtime lease found.";
  params.runtime.stdout.log(`${stageDetail}${leaseDetail} Skipping final snapshot handoff wait.`);
  return false;
}
async function waitForRuntimeHandoffAck(params) {
  const started = Date.now();
  let lastError;
  while (true) {
    try {
      const ack = await readRuntimeHandoffAck(params.hub, params.bucket, params.bucketPrefix);
      if (ack?.requestId === params.requestId && ack.runtimeId === params.runtimeId) {
        return ack;
      }
      lastError = void 0;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    if (Date.now() - started >= params.timeoutMs) {
      const detail = lastError ? `; last ack read failed: ${lastError}` : "";
      throw new Error(`timed out waiting for ${params.runtimeId} to acknowledge handoff ${params.requestId}${detail}`);
    }
    await delay2(params.pollMs);
  }
}
function requiredSecret(secrets, key) {
  const value = secrets[key];
  if (!value) {
    throw new Error(`missing local secret ${key}; cannot configure gateway`);
  }
  return value;
}
async function ensureDeploymentCredentialKey(runtime, agent, existing) {
  const secrets = existing ?? await readSecretEnv(runtime.configRoot, agent).catch(() => ({}));
  if (secrets.MLCLAW_CREDENTIAL_KEY) {
    return secrets;
  }
  const updated = {
    ...secrets,
    MLCLAW_CREDENTIAL_KEY: randomBytes(32).toString("base64url")
  };
  await writeSecretEnv(runtime.configRoot, agent, updated);
  return updated;
}
async function restoreMatchingDeploymentCredentialKey(runtime, agent, expectedSha256, suppliedCredentialKey, persist = true) {
  const secrets = await readSecretEnv(runtime.configRoot, agent).catch(() => ({}));
  const candidates = [suppliedCredentialKey, runtime.env.MLCLAW_CREDENTIAL_KEY, secrets.MLCLAW_CREDENTIAL_KEY].filter(
    (value) => Boolean(value)
  );
  const credentialKey = candidates.find((value) => createHash3("sha256").update(value).digest("hex") === expectedSha256);
  if (!credentialKey) {
    throw new Error("local MLCLAW_CREDENTIAL_KEY is missing or does not match the canonical deployment identity");
  }
  if (persist && secrets.MLCLAW_CREDENTIAL_KEY !== credentialKey) {
    await writeSecretEnv(runtime.configRoot, agent, { ...secrets, MLCLAW_CREDENTIAL_KEY: credentialKey });
  }
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
  const canonicalTemplate = isCanonicalTemplateSpace(repoId, runtime.env);
  if (!canonicalTemplate && !variables.has("MLCLAW_TEMPLATE_REV") && !variables.has("OPENCLAW_HF_TEMPLATE_REV") && !opts.force) {
    throw new Error(`${repoId} does not look like a ML Claw deployment; pass --force to update anyway`);
  }
  const runtimeImage = resolveSpaceRuntimeImage(opts, runtime.env);
  const agentName = variables.get("OPENCLAW_AGENT_NAME")?.value?.trim() || repoId.split("/")[1] || "openclaw";
  if (!canonicalTemplate) {
    await ensureUpdateRouterToken({
      repoId,
      agentName,
      model: variables.get("OPENCLAW_MODEL")?.value ?? DEFAULT_MODEL2,
      opts,
      hub,
      runtime
    });
  }
  runtime.stdout.log(`Generating current Space files into ${repoId}`);
  const { templateRev } = await runtime.pushTemplateToSpace({
    targetRepo: repoId,
    token: hfToken,
    ...runtimeImage ? { runtimeImage } : {}
  });
  await hub.addSpaceVariable(repoId, "MLCLAW_TEMPLATE_REV", templateRev);
  await hub.addSpaceVariable(repoId, "MLCLAW_RUNTIME_IMAGE", runtimeImage ?? bundledSpaceRuntimeRef(templateRev));
  if (canonicalTemplate) {
    await hub.addSpaceVariable(repoId, "MLCLAW_CANONICAL_SPACE_ID", canonicalTemplateSpaceId(runtime.env));
    await doctor(repoId, { fix: true }, hub, runtime);
    runtime.stdout.log(`Space deployment triggered: ${repoId}`);
    return;
  }
  await hub.addSpaceVariable(repoId, "MLCLAW_GATEWAY_LOCATION", "space");
  await hub.addSpaceVariable(repoId, "MLCLAW_RUNTIME_ID", spaceRuntimeId(agentName));
  await hub.addSpaceVariable(repoId, "MLCLAW_OPENCLAW_PORT", String(DEFAULT_SPACE_OPENCLAW_PORT));
  await hub.addSpaceVariable(repoId, "OPENCLAW_GATEWAY_PORT", String(DEFAULT_SPACE_OPENCLAW_PORT));
  const bucket = variables.get("OPENCLAW_HF_STATE_BUCKET")?.value;
  if (bucket) {
    await hub.addSpaceVariable(repoId, "MLCLAW_STATE_MOUNT_DIR", SPACE_STATE_MOUNT_DIR);
    await hub.addSpaceVariable(repoId, "OPENCLAW_LIVE_DIR", SPACE_LIVE_DIR);
    await hub.addSpaceVariable(repoId, "MLCLAW_RUNTIME_SETTINGS_FILE", `${SPACE_LIVE_DIR}/.mlclaw/settings.json`);
    await ensureSpaceStateVolume(hub, repoId, bucket);
  }
  await doctor(repoId, { fix: true }, hub, runtime);
  runtime.stdout.log(`Space deployment triggered: ${repoId}`);
}
async function ensureUpdateRouterToken(params) {
  if (!isHuggingFaceRouterModel(params.model)) {
    return;
  }
  const spaceSecrets = await params.hub.getSpaceSecrets(params.repoId);
  const hasExplicitOverride = params.opts.routerToken !== void 0 || params.opts.routerTokenFile !== void 0;
  if (hasBrokerOrRouterTokenSecretMap(spaceSecrets) && !hasExplicitOverride) {
    return;
  }
  const hasManifest = await manifestExists(params.runtime.configRoot, params.agentName);
  const localSecrets = hasManifest ? await readSecretEnv(params.runtime.configRoot, params.agentName).catch(() => ({})) : {};
  const routerToken = hasExplicitOverride ? await resolveRouterToken({
    opts: params.opts,
    runtime: params.runtime,
    existingSecrets: localSecrets,
    model: params.model
  }) : void 0;
  const brokerToken = routerToken ? void 0 : await params.runtime.readToken(params.runtime.env);
  const credential = routerToken ?? brokerToken;
  if (!credential) {
    throw new Error("Hugging Face broker credential is unavailable");
  }
  await params.hub.addSpaceSecret(
    params.repoId,
    routerToken ? "MLCLAW_ROUTER_TOKEN" : "MLCLAW_BROKER_HF_TOKEN",
    credential
  );
  if (hasManifest) {
    await writeSecretEnv(params.runtime.configRoot, params.agentName, {
      ...localSecrets,
      ...routerToken ? { MLCLAW_ROUTER_TOKEN: routerToken } : { MLCLAW_BROKER_HF_TOKEN: brokerToken }
    });
  }
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
  const canonicalTemplate = isCanonicalTemplateSpace(repoId, runtime.env);
  if (canonicalTemplate) {
    const expectedCanonicalSpace = canonicalTemplateSpaceId(runtime.env);
    if ((variables.get("MLCLAW_CANONICAL_SPACE_ID")?.value ?? "") !== expectedCanonicalSpace) {
      if (fix) {
        await hub.addSpaceVariable(repoId, "MLCLAW_CANONICAL_SPACE_ID", expectedCanonicalSpace);
        fixed.push("set MLCLAW_CANONICAL_SPACE_ID");
      } else {
        issues.push(`MLCLAW_CANONICAL_SPACE_ID is not ${expectedCanonicalSpace}`);
      }
    }
    if (!variables.has("MLCLAW_TEMPLATE_REV") && !variables.has("OPENCLAW_HF_TEMPLATE_REV")) {
      issues.push("MLCLAW_TEMPLATE_REV is missing; run `mlclaw update` to refresh the template Space");
    }
    addRuntimeImageFindings(variables.get("MLCLAW_RUNTIME_IMAGE")?.value, issues);
    const runtimeInfo2 = await hub.getSpaceRuntime(repoId);
    runtime.stdout.log(`Space: ${repoId}`);
    runtime.stdout.log("Mode: template");
    runtime.stdout.log(`Stage: ${runtimeInfo2.stage ?? "unknown"}`);
    runtime.stdout.log(`Hardware: ${formatRuntimeValue(runtimeInfo2.requested_hardware ?? runtimeInfo2.hardware)}`);
    if (typeof runtimeInfo2.sleep_time === "number") {
      runtime.stdout.log(`Sleep time: ${runtimeInfo2.sleep_time}`);
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
    return;
  }
  const bucket = variables.get("OPENCLAW_HF_STATE_BUCKET")?.value ?? opts.bucket;
  let signedInUser;
  const currentUsername = async () => {
    signedInUser ??= (await hub.whoami()).name;
    return signedInUser;
  };
  if (!bucket) {
    issues.push("OPENCLAW_HF_STATE_BUCKET is missing");
  } else if (!variables.has("OPENCLAW_HF_STATE_BUCKET") && fix) {
    await hub.addSpaceVariable(repoId, "OPENCLAW_HF_STATE_BUCKET", bucket);
    fixed.push("set OPENCLAW_HF_STATE_BUCKET");
  }
  if ((variables.get("MLCLAW_STATE_MOUNT_DIR")?.value ?? "") !== SPACE_STATE_MOUNT_DIR) {
    if (fix) {
      await hub.addSpaceVariable(repoId, "MLCLAW_STATE_MOUNT_DIR", SPACE_STATE_MOUNT_DIR);
      fixed.push("set MLCLAW_STATE_MOUNT_DIR");
    } else {
      issues.push(`MLCLAW_STATE_MOUNT_DIR is not ${SPACE_STATE_MOUNT_DIR}`);
    }
  }
  if ((variables.get("OPENCLAW_LIVE_DIR")?.value ?? "") !== SPACE_LIVE_DIR) {
    if (fix) {
      await hub.addSpaceVariable(repoId, "OPENCLAW_LIVE_DIR", SPACE_LIVE_DIR);
      fixed.push("set OPENCLAW_LIVE_DIR");
    } else {
      issues.push(`OPENCLAW_LIVE_DIR is not ${SPACE_LIVE_DIR}`);
    }
  }
  const expectedRuntimeSettingsFile = `${SPACE_LIVE_DIR}/.mlclaw/settings.json`;
  if ((variables.get("MLCLAW_RUNTIME_SETTINGS_FILE")?.value ?? "") !== expectedRuntimeSettingsFile) {
    if (fix) {
      await hub.addSpaceVariable(repoId, "MLCLAW_RUNTIME_SETTINGS_FILE", expectedRuntimeSettingsFile);
      fixed.push("set MLCLAW_RUNTIME_SETTINGS_FILE");
    } else {
      issues.push(`MLCLAW_RUNTIME_SETTINGS_FILE is not ${expectedRuntimeSettingsFile}`);
    }
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
  if (!secrets.has("MLCLAW_BROKER_HF_TOKEN")) {
    if (fix) {
      await hub.addSpaceSecret(repoId, "MLCLAW_BROKER_HF_TOKEN", await runtime.readToken(runtime.env));
      secrets.set("MLCLAW_BROKER_HF_TOKEN", { key: "MLCLAW_BROKER_HF_TOKEN" });
      fixed.push("set secret MLCLAW_BROKER_HF_TOKEN");
    } else {
      issues.push("secret MLCLAW_BROKER_HF_TOKEN is missing");
    }
  }
  const staleTokenSecrets = ["HF_TOKEN", "HUGGINGFACE_HUB_TOKEN"].filter((key) => secrets.has(key));
  if (staleTokenSecrets.length > 0) {
    const model = variables.get("OPENCLAW_MODEL")?.value ?? DEFAULT_MODEL2;
    const canDelete = canDeleteBroadTokenSecrets({
      model,
      routerTokenPresent: hasBrokerOrRouterTokenSecretMap(secrets)
    });
    if (fix && canDelete) {
      await deleteStaleSpaceTokenSecrets(hub, repoId);
      fixed.push(`deleted stale secret${staleTokenSecrets.length === 1 ? "" : "s"} ${staleTokenSecrets.join(", ")}`);
    } else if (fix) {
      issues.push(
        `stale broad Hub token secret${staleTokenSecrets.length === 1 ? "" : "s"} present: ${staleTokenSecrets.join(", ")}; add MLCLAW_BROKER_HF_TOKEN before removing`
      );
    } else {
      issues.push(
        `stale broad Hub token secret${staleTokenSecrets.length === 1 ? "" : "s"} present: ${staleTokenSecrets.join(", ")}`
      );
    }
  }
  if (!secrets.has("MLCLAW_SESSION_SECRET")) {
    if (fix) {
      await hub.addSpaceSecret(repoId, "MLCLAW_SESSION_SECRET", randomBytes(48).toString("base64url"));
      fixed.push("set secret MLCLAW_SESSION_SECRET");
    } else {
      issues.push("secret MLCLAW_SESSION_SECRET is missing");
    }
  }
  if (!secrets.has("MLCLAW_CREDENTIAL_KEY")) {
    if (fix) {
      const agent = variables.get("OPENCLAW_AGENT_NAME")?.value?.trim() || repoId.split("/")[1] || "openclaw";
      const credentialKey = await manifestExists(runtime.configRoot, agent) ? requiredSecret(await ensureDeploymentCredentialKey(runtime, agent), "MLCLAW_CREDENTIAL_KEY") : randomBytes(32).toString("base64url");
      await hub.addSpaceSecret(repoId, "MLCLAW_CREDENTIAL_KEY", credentialKey);
      fixed.push("set secret MLCLAW_CREDENTIAL_KEY");
    } else {
      issues.push("secret MLCLAW_CREDENTIAL_KEY is missing");
    }
  }
  if (!variables.has("MLCLAW_TEMPLATE_REV") && !variables.has("OPENCLAW_HF_TEMPLATE_REV")) {
    issues.push("MLCLAW_TEMPLATE_REV is missing; updates cannot verify template lineage");
  }
  if ((variables.get("MLCLAW_GATEWAY_LOCATION")?.value ?? "") !== "space") {
    issues.push("MLCLAW_GATEWAY_LOCATION is not set to space");
  }
  addRuntimeImageFindings(variables.get("MLCLAW_RUNTIME_IMAGE")?.value, issues);
  if ((variables.get("MLCLAW_OPENCLAW_PORT")?.value ?? "") !== String(DEFAULT_SPACE_OPENCLAW_PORT) && fix) {
    await hub.addSpaceVariable(repoId, "MLCLAW_OPENCLAW_PORT", String(DEFAULT_SPACE_OPENCLAW_PORT));
    fixed.push("set MLCLAW_OPENCLAW_PORT");
  } else if ((variables.get("MLCLAW_OPENCLAW_PORT")?.value ?? "") !== String(DEFAULT_SPACE_OPENCLAW_PORT)) {
    issues.push(`MLCLAW_OPENCLAW_PORT is not ${DEFAULT_SPACE_OPENCLAW_PORT}`);
  }
  if ((variables.get("OPENCLAW_GATEWAY_PORT")?.value ?? "") !== String(DEFAULT_SPACE_OPENCLAW_PORT) && fix) {
    await hub.addSpaceVariable(repoId, "OPENCLAW_GATEWAY_PORT", String(DEFAULT_SPACE_OPENCLAW_PORT));
    fixed.push("set OPENCLAW_GATEWAY_PORT");
  } else if ((variables.get("OPENCLAW_GATEWAY_PORT")?.value ?? "") !== String(DEFAULT_SPACE_OPENCLAW_PORT)) {
    issues.push(`OPENCLAW_GATEWAY_PORT is not ${DEFAULT_SPACE_OPENCLAW_PORT}`);
  }
  if (!variables.has("MLCLAW_ALLOWED_USERS")) {
    if (fix) {
      await hub.addSpaceVariable(repoId, "MLCLAW_ALLOWED_USERS", await currentUsername());
      fixed.push("set MLCLAW_ALLOWED_USERS");
    } else {
      issues.push("MLCLAW_ALLOWED_USERS is missing");
    }
  }
  if (!variables.has("MLCLAW_ADMINS")) {
    if (fix) {
      await hub.addSpaceVariable(repoId, "MLCLAW_ADMINS", await currentUsername());
      fixed.push("set MLCLAW_ADMINS");
    } else {
      issues.push("MLCLAW_ADMINS is missing");
    }
  }
  if (bucket) {
    await hub.assertBucketAccessible(bucket);
  }
  const runtimeInfo = await hub.getSpaceRuntime(repoId);
  if (bucket && !hasStateVolume(runtimeInfo.volumes, bucket)) {
    if (fix) {
      await hub.setSpaceVolumes(repoId, mergeStateVolume(requireRuntimeVolumes(runtimeInfo, repoId), bucket));
      fixed.push(`mounted bucket ${bucket} at ${SPACE_STATE_MOUNT_DIR}`);
    } else {
      issues.push(`bucket ${bucket} is not mounted read-write at ${SPACE_STATE_MOUNT_DIR}`);
    }
  }
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
function canonicalTemplateSpaceId(env) {
  return nonEmpty(env.MLCLAW_CANONICAL_SPACE_ID) ?? DEFAULT_CANONICAL_TEMPLATE_SPACE;
}
function isCanonicalTemplateSpace(repoId, env) {
  return repoId === canonicalTemplateSpaceId(env);
}
function addRuntimeImageFindings(value, issues) {
  const runtimeImage = value?.trim();
  if (!runtimeImage) {
    issues.push("MLCLAW_RUNTIME_IMAGE is missing; run `mlclaw update` to refresh the Space runtime");
    return;
  }
  if (runtimeImage.startsWith("ghcr.io/osolmaz/mlclaw-runtime:")) {
    issues.push(
      `MLCLAW_RUNTIME_IMAGE points at the legacy mlclaw-runtime package; run \`mlclaw update\` to use ${DEFAULT_RUNTIME_IMAGE}`
    );
    return;
  }
  if (runtimeImage.startsWith("bundled:")) {
    issues.push(`MLCLAW_RUNTIME_IMAGE uses a bundled runtime; run \`mlclaw update\` to use ${DEFAULT_RUNTIME_IMAGE}`);
  }
}
async function settings(repoId, opts, hub, runtime) {
  if (opts.gateway) {
    throw new Error("gateway location changes must use `mlclaw gateway migrate` to preserve state");
  }
  if (!opts.hardware && typeof opts.sleepTime !== "number") {
    throw new Error("usage: mlclaw settings <owner/space> [--hardware flavor] [--sleep-time seconds]");
  }
  if (opts.hardware && isPaidHardware(opts.hardware)) {
    await confirmPaidHardware({
      hardware: opts.hardware,
      ...typeof opts.sleepTime === "number" ? { sleepTime: opts.sleepTime } : {},
      yes: Boolean(opts.yes),
      runtime
    });
  }
  const matches = (await listManifests(runtime.configRoot)).filter((manifest) => manifest.space === repoId);
  if (matches.length !== 1) {
    throw new Error(
      matches.length === 0 ? `no local deployment cache owns Space ${repoId}; run mlclaw bootstrap to recover it first` : `multiple local deployments reference Space ${repoId}; repair the deployment caches before changing settings`
    );
  }
  const current = matches[0];
  const bucketPrefix = await readDeploymentBucketPrefix(runtime, current.agent);
  const target = {
    ...current,
    ...opts.hardware ? { spaceHardware: opts.hardware } : {},
    ...typeof opts.sleepTime === "number" ? { spaceSleepTime: opts.sleepTime } : {},
    updatedAt: runtime.now().toISOString()
  };
  let result;
  const reconciled = await reconcileManifest({
    manifest: target,
    bucketPrefix,
    hub,
    runtime,
    apply: async ({ manifest, assertLease }) => {
      await assertLease();
      result = opts.hardware ? await hub.requestSpaceHardware(repoId, opts.hardware, opts.sleepTime) : await hub.setSpaceSleepTime(repoId, opts.sleepTime);
      await writeManifest(runtime.configRoot, manifest);
    }
  });
  await writeManifest(runtime.configRoot, reconciled.manifest);
  if (!result) throw new Error("Space settings update returned no runtime state");
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
async function setDeploymentVariables(hub, repoId, variables, assertMutation = async () => void 0) {
  for (const [key, value] of Object.entries(variables)) {
    await assertMutation();
    await hub.addSpaceVariable(repoId, key, value);
  }
}
async function setDeploymentSecrets(hub, repoId, secrets, assertMutation = async () => void 0) {
  for (const [key, value] of Object.entries(secrets)) {
    await assertMutation();
    await hub.addSpaceSecret(repoId, key, value);
  }
}
async function setSpaceGatewaySecrets(hub, repoId, hfToken, secrets, assertMutation = async () => void 0) {
  await setDeploymentSecrets(
    hub,
    repoId,
    {
      MLCLAW_SESSION_SECRET: requiredSecret(secrets, "MLCLAW_SESSION_SECRET"),
      MLCLAW_CREDENTIAL_KEY: requiredSecret(secrets, "MLCLAW_CREDENTIAL_KEY"),
      MLCLAW_BROKER_HF_TOKEN: hfToken,
      ...secrets.MLCLAW_ROUTER_TOKEN ? { MLCLAW_ROUTER_TOKEN: secrets.MLCLAW_ROUTER_TOKEN } : {},
      ...secrets.TELEGRAM_BOT_TOKEN ? { TELEGRAM_BOT_TOKEN: secrets.TELEGRAM_BOT_TOKEN } : {},
      ...secrets.TELEGRAM_ALLOWED_USERS ? { TELEGRAM_ALLOWED_USERS: secrets.TELEGRAM_ALLOWED_USERS } : {},
      ...secrets.TELEGRAM_PROXY ? { TELEGRAM_PROXY: secrets.TELEGRAM_PROXY } : {},
      ...secrets.TELEGRAM_API_ROOT ? { TELEGRAM_API_ROOT: secrets.TELEGRAM_API_ROOT } : {}
    },
    assertMutation
  );
}
async function deleteStaleSpaceTokenSecrets(hub, repoId, assertMutation = async () => void 0) {
  for (const key of ["HF_TOKEN", "HUGGINGFACE_HUB_TOKEN"]) {
    await assertMutation();
    await hub.deleteSpaceSecret(repoId, key);
  }
}
function canDeleteBroadTokenSecrets(params) {
  return params.routerTokenPresent || !isHuggingFaceRouterModel(params.model);
}
function hasRouterTokenSecretRecord(secrets) {
  return Boolean(secrets.MLCLAW_ROUTER_TOKEN || secrets.HF_ROUTER_TOKEN);
}
function hasRouterTokenSecretMap(secrets) {
  return secrets.has("MLCLAW_ROUTER_TOKEN") || secrets.has("HF_ROUTER_TOKEN");
}
function hasBrokerOrRouterTokenSecretRecord(secrets) {
  return Boolean(secrets.MLCLAW_BROKER_HF_TOKEN) || hasRouterTokenSecretRecord(secrets);
}
function hasBrokerOrRouterTokenSecretMap(secrets) {
  return secrets.has("MLCLAW_BROKER_HF_TOKEN") || hasRouterTokenSecretMap(secrets);
}
function assertDedicatedRouterToken(model, secrets) {
  if (isHuggingFaceRouterModel(model) && !hasBrokerOrRouterTokenSecretRecord(secrets)) {
    throw new Error("Hugging Face Router models require MLCLAW_BROKER_HF_TOKEN or a dedicated inference token");
  }
}
async function ensureSpaceStateVolume(hub, repoId, bucket, opts = {}) {
  await opts.assertMutation?.();
  const runtime = await hub.getSpaceRuntime(repoId);
  const volumes = Array.isArray(runtime.volumes) ? runtime.volumes : opts.allowMissingVolumes ? [] : requireRuntimeVolumes(runtime, repoId);
  await opts.assertMutation?.();
  await hub.setSpaceVolumes(repoId, mergeStateVolume(volumes, bucket));
}
function requireRuntimeVolumes(runtime, repoId) {
  if (!Array.isArray(runtime.volumes)) {
    throw new Error(`Space runtime metadata for ${repoId} did not include volumes; refusing to replace mounts`);
  }
  return runtime.volumes;
}
function mergeStateVolume(existing, bucket) {
  return [
    ...existing.filter((volume) => volumeMountPath(volume) !== SPACE_STATE_MOUNT_DIR).map(normalizeSpaceVolume),
    {
      type: "bucket",
      source: bucket,
      mountPath: SPACE_STATE_MOUNT_DIR,
      readOnly: false
    }
  ];
}
function hasStateVolume(volumes, bucket) {
  return Boolean(
    volumes?.some(
      (volume) => volume.type === "bucket" && volume.source === bucket && volumeMountPath(volume) === SPACE_STATE_MOUNT_DIR && volumeReadOnly(volume) !== true
    )
  );
}
function normalizeSpaceVolume(volume) {
  const normalized = { ...volume };
  const mountPath = volumeMountPath(volume);
  if (mountPath) {
    normalized.mountPath = mountPath;
  }
  const readOnly = volumeReadOnly(volume);
  if (typeof readOnly === "boolean") {
    normalized.readOnly = readOnly;
  }
  return normalized;
}
function volumeMountPath(volume) {
  return volume.mountPath ?? volume.mount_path;
}
function volumeReadOnly(volume) {
  return volume.readOnly ?? volume.read_only;
}
async function clearSpaceGatewayDisabled(hub, repoId) {
  try {
    await hub.deleteSpaceVariable(repoId, "MLCLAW_GATEWAY_DISABLED");
  } catch (err) {
    if (err instanceof HubApiError2 && err.status === 404) {
      return;
    }
    throw err;
  }
}
async function readOptionalTelegramToken(opts, runtime) {
  const direct = opts.telegramToken ?? runtime.env.TELEGRAM_BOT_TOKEN;
  if (direct) {
    return direct;
  }
  if (opts.telegramTokenFile) {
    const raw = await fs16.readFile(opts.telegramTokenFile, "utf8");
    const match = raw.match(/(?:^|\n)\s*TELEGRAM_BOT_TOKEN\s*=\s*['"]?([^'"\n]+)['"]?/);
    return (match?.[1] ?? raw.trim()).trim();
  }
  return void 0;
}
async function resolveRouterToken(params) {
  const explicit = nonEmpty(params.opts.routerToken) ?? await readOptionalRouterTokenFile(params.opts.routerTokenFile);
  const direct = explicit ?? params.runtime.env.MLCLAW_ROUTER_TOKEN ?? params.runtime.env.HF_ROUTER_TOKEN ?? params.existingSecrets?.MLCLAW_ROUTER_TOKEN ?? params.existingSecrets?.HF_ROUTER_TOKEN;
  const existing = nonEmpty(direct);
  if (existing) {
    return existing;
  }
  if (!isHuggingFaceRouterModel(params.model)) {
    return void 0;
  }
  return void 0;
}
async function readOptionalRouterTokenFile(file) {
  if (!file) {
    return void 0;
  }
  const raw = await fs16.readFile(file, "utf8");
  const parsed = parseSecretEnv(raw);
  return nonEmpty(parsed.MLCLAW_ROUTER_TOKEN) ?? nonEmpty(parsed.HF_ROUTER_TOKEN) ?? nonEmpty(raw);
}
async function resolveBrokerHfToken(params) {
  const fileToken = await readOptionalBrokerHfTokenFile(params.opts.brokerHfTokenFile);
  const configuredToken = fileToken ?? nonEmpty(params.runtime.env.MLCLAW_BROKER_HF_TOKEN) ?? nonEmpty(params.preferredToken) ?? nonEmpty(params.existingSecrets.MLCLAW_BROKER_HF_TOKEN);
  let token = configuredToken ?? params.hfToken;
  let identity;
  try {
    identity = token === params.hfToken ? params.hfIdentity : await params.runtime.hubFactory(token).whoami();
    if (identity.name !== params.hfIdentity.name) {
      throw new Error(`broker token belongs to ${identity.name}, not ${params.hfIdentity.name}`);
    }
  } catch (error) {
    if (fileToken) throw error;
    const warning = `The saved HF Broker credential could not be used (${errorMessage(error)}). Using the active Hugging Face login instead.`;
    if (params.runtime.prompt.isInteractive()) {
      params.runtime.prompt.note(warning, "HF Broker credential");
    } else {
      params.runtime.stderr.error(`Warning: ${warning}`);
    }
    token = params.hfToken;
    identity = params.hfIdentity;
  }
  const assessment = assessBrokerCredential(identity, params.owner);
  if (assessment.status === "sufficient") return token;
  if (params.skipReview) return token;
  const detail = brokerCredentialAssessmentDetail(assessment);
  if (!params.runtime.prompt.isInteractive()) {
    params.runtime.stderr.error(
      `Warning: ${detail}. Continuing with the current credential; some broker operations may fail with a permission error.`
    );
    return token;
  }
  params.runtime.prompt.note(
    `${detail}.

ML Claw can open a Hugging Face token form with BrokerKit's permissions preselected. You still create the token on Hugging Face, then paste it here. Your current HF CLI login will not be changed.`,
    "HF Broker credential"
  );
  const action = await promptSelect(
    "How should HF Broker authenticate?",
    [
      {
        value: "create",
        label: "Create a dedicated broker token",
        hint: "Recommended for complete broker coverage"
      },
      {
        value: "current",
        label: "Continue with the current credential",
        hint: "Some broker operations may fail"
      }
    ],
    "create",
    params.runtime
  );
  if (action === "current") return token;
  const url = buildBrokerTokenUrl(params.owner, params.hfIdentity.name);
  const opened = await params.runtime.hfCli.openUrl(url);
  params.runtime.prompt.note(
    `${opened ? "The token form was opened in your browser." : "Open this token form in your browser."}

Name and create the token, then copy it. The URL contains permission names only; it contains no credential.

${url}`,
    "Create the broker token"
  );
  for (; ; ) {
    const replacement = readPromptValue(
      await params.runtime.prompt.password({ message: "Paste the new Hugging Face broker token" }),
      "Hugging Face broker token"
    );
    try {
      const replacementIdentity = await params.runtime.hubFactory(replacement).whoami();
      if (replacementIdentity.name !== params.hfIdentity.name) {
        throw new Error(`token belongs to ${replacementIdentity.name}, not ${params.hfIdentity.name}`);
      }
      const replacementAssessment = assessBrokerCredential(replacementIdentity, params.owner);
      if (replacementAssessment.status !== "sufficient") {
        throw new Error(brokerCredentialAssessmentDetail(replacementAssessment));
      }
      params.runtime.prompt.note(
        "The dedicated broker token was verified. It will be stored only in ML Claw's trusted broker configuration.",
        "HF Broker credential ready"
      );
      return replacement;
    } catch (error) {
      params.runtime.prompt.note(errorMessage(error), "Broker token was not accepted");
      if (!await promptConfirm("Try another broker token?", true, params.runtime)) return token;
    }
  }
}
async function readOptionalBrokerHfTokenFile(file) {
  if (!file) return void 0;
  const raw = await fs16.readFile(file, "utf8");
  const parsed = parseSecretEnv(raw);
  const token = nonEmpty(parsed.MLCLAW_BROKER_HF_TOKEN) ?? nonEmpty(raw);
  if (!token) throw new Error("HF Broker token file is empty");
  return token;
}
function brokerCredentialAssessmentDetail(assessment) {
  if (assessment.status === "unknown") return assessment.reason;
  const shown = assessment.missing.slice(0, 8);
  const remaining = assessment.missing.length - shown.length;
  return `The HF Broker credential is missing ${assessment.missing.length} required permission${assessment.missing.length === 1 ? "" : "s"}: ${shown.join(", ")}${remaining > 0 ? `, and ${remaining} more` : ""}`;
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function isHuggingFaceRouterModel(model) {
  return model.trim().startsWith("huggingface/");
}
async function promptAgentName(runtime) {
  if (!runtime.prompt.isInteractive()) {
    return "mlclaw";
  }
  const value = await runtime.prompt.text({
    message: "Agent name",
    placeholder: "mlclaw",
    initialValue: "mlclaw"
  });
  return readPromptValue(value, "Agent name");
}
async function resolveHardware(params) {
  const hardware = params.requestedHardware ?? (params.requiresMessagingEgress ? TELEGRAM_HARDWARE : void 0);
  if (!hardware) {
    const label = params.defaultLabel ?? "default Space CPU";
    return typeof params.requestedSleepTime === "number" ? { kind: "default", label, sleepTime: params.requestedSleepTime } : { kind: "default", label };
  }
  const sleepTime = isPaidHardware(hardware) ? params.requestedSleepTime ?? TELEGRAM_SLEEP_TIME : params.requestedSleepTime;
  if (params.requiresMessagingEgress && !isPaidHardware(hardware)) {
    throw new Error(
      `Telegram requires upgraded paid Space hardware today; use --hardware ${TELEGRAM_HARDWARE} or --gateway local`
    );
  }
  if (isPaidHardware(hardware)) {
    const paidSleepTime = params.requestedSleepTime ?? TELEGRAM_SLEEP_TIME;
    await confirmPaidHardware({
      hardware,
      sleepTime: paidSleepTime,
      yes: params.yes,
      runtime: params.runtime
    });
    return { kind: "explicit", hardware, label: hardware, sleepTime: paidSleepTime };
  }
  return typeof sleepTime === "number" ? { kind: "explicit", hardware, label: hardware, sleepTime } : { kind: "explicit", hardware, label: hardware };
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
async function promptSelect(message, options, initialValue, runtime) {
  const value = await runtime.prompt.select({ message, options, initialValue });
  if (q(value)) {
    runtime.prompt.cancel("Cancelled");
    throw new Error("cancelled");
  }
  return value;
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
function parseTailscaleMode(value) {
  if (value === "off" || value === "direct" || value === "serve") return value;
  throw new InvalidArgumentError(`expected tailscale mode off, direct, or serve; got ${value}`);
}
function parseLocalPort(value) {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError("expected an unprivileged port between 1024 and 65535");
  }
  const port = parseInteger(value);
  if (port < 1024 || port > 65535) {
    throw new InvalidArgumentError("expected an unprivileged port between 1024 and 65535");
  }
  return port;
}
function isPaidHardware(hardware) {
  return hardware !== DEFAULT_HARDWARE;
}
async function runCli() {
  if (process4.argv.includes("--skill")) {
    return handleSkillflag(process4.argv, {
      skillsRoot: findSkillsRoot(import.meta.url),
      includeBundledSkill: false
    });
  }
  return main();
}
var invokedPath = "";
try {
  invokedPath = process4.argv[1] ? pathToFileURL2(realpathSync(process4.argv[1])).href : "";
} catch {
  invokedPath = "";
}
if (import.meta.url === invokedPath) {
  runCli().then((code) => process4.exit(code));
}
export {
  DEFAULT_GATEWAY_LOCATION,
  DEFAULT_HARDWARE,
  DEFAULT_LOCAL_PORT,
  DEFAULT_MODEL2 as DEFAULT_MODEL,
  DEFAULT_SPACE_OPENCLAW_PORT,
  LOCAL_LIVE_DIR,
  LOCAL_START_SETTLE_MS,
  LOCAL_VOLUME_MOUNT_PATH,
  SPACE_HANDOFF_POLL_MS,
  SPACE_HANDOFF_TIMEOUT_MS,
  SPACE_LIVE_DIR,
  SPACE_STATE_MOUNT_DIR,
  TELEGRAM_HARDWARE,
  TELEGRAM_SLEEP_TIME,
  createProgram,
  main,
  mergeStateVolume
};
