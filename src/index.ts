import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import {
    executeCommandWithFileReader,
    executeCommandWithLogsReader,
} from "./utils/executors";
import { getOutputFileName, isOutputExist } from "./utils/outputs";

const CALL_DIRECTORY = process.cwd();
const choices = [
    { name: "yarn", value: "yarn " },
    { name: "npm", value: "npm run " },
    { name: "pnpm", value: "pnpm " },
];

type LogsTypes = "success" | "error" | "warning" | "log";

const { stderr, stdout } = process;

async function init() {
    const prompts = await getPrompts();
    const generatedValues = await callCDK(prompts.command, prompts.manager);

    createEnvironmentFile(generatedValues);

    function log(log: string, type: LogsTypes = "log") {
        const success = (text: string) => stdout.write(chalk.green(text));
        const warning = (text: string) => stdout.write(chalk.yellow(text));
        const error = (text: string) => stderr.write(chalk.red(text));
        const logger = (text: string) => stdout.write(chalk.cyan(text));

        switch (type) {
            case "success":
                success(`${log}\n`);
                break;
            case "warning":
                warning(`${log}\n`);
                break;
            case "error":
                error(`${log}\n`);
                break;
            case "log":
                logger(`${log}\n`);
                break;
        }
    }

    async function getPrompts() {
        const command = await input({ message: "What is the command?" });
        const manager = await select({ message: "Package manager:", choices });

        log(
            "All the necessary prompts recieved! Proceeding with cdk deploy command"
        );

        return {
            command,
            manager,
        };
    }

    function getScriptString(command: string): string {
        const filePath = path.join(CALL_DIRECTORY, "package.json");
        const result = JSON.parse(readFileSync(filePath, "utf-8"));
        const isScriptExist = Object.keys(result.scripts).includes(command);

        if (!isScriptExist) {
            log("There is no provided script", "error");

            process.exit(1);
        }

        return result.scripts[command];
    }

    async function callCDK(command: string, packageManager: string) {
        log("Getting script line...");

        const script = getScriptString(command);

        log(
            `Script line recieved, proceeding with command: ${script}`,
            "success"
        );

        const isOutput = isOutputExist(script);
        const composedCommand = packageManager + command;

        log(`Is output present in script line: ${isOutput}`);

        switch (isOutput) {
            case true: {
                const fileName = getOutputFileName(script);

                log(`Output file exist. Filename is: ${fileName}`, "success");

                const result = executeCommandWithFileReader(
                    composedCommand,
                    fileName
                );

                return result;
            }
            case false: {
                log("Output file is not defined. Proceeding with logs reader");
                const result = await executeCommandWithLogsReader(
                    composedCommand
                );

                return result;
            }
        }
    }

    function createEnvironmentFile(store: string[]) {
        const parsedStore = store.join("\n");
        const envFile = path.join(CALL_DIRECTORY, ".env");

        log("Got all key-value pairs, creating .env file", "success");

        writeFileSync(envFile, parsedStore);

        log(".env file created", "success");
        log("I am finished here, terminating process...", "success");
    }

    process.exit(1);
}

init();
