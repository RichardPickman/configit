import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import {
    executeCommandWithFileReader,
    executeCommandWithLogsReader,
} from "./utils/executors";
import { getOutputFileName, isOutputExist } from "./utils/outputs";
import { getVariablesFromStringOutput } from "./utils/helpers";

const CALL_DIRECTORY = process.cwd();

type LogsTypes = "success" | "error" | "warning" | "log";

const prompts = {
    command: { message: "What is the command?" },
    manager: {
        message: "Package manager:",
        choices: [
            { name: "yarn", value: "yarn " },
            { name: "npm", value: "npm run " },
            { name: "pnpm", value: "pnpm " },
        ],
    },
    environment: {
        message: "What environment for?",
        choices: [
            { name: "development", value: "development" },
            { name: "production", value: "production" },
        ],
    },
};

const { stderr, stdout } = process;

function getVariablesFromFile(path: string) {
    const file = readFileSync(path, "utf-8");
    const result = getVariablesFromStringOutput(file);

    return result;
}

async function init() {
    const variables: string[] = [];
    const answers = await getPrompts();

    await callCDK(answers.command, answers.manager);

    createEnvironmentFile(variables);

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

    function populateWithGlobalVariables() {
        try {
            const homeDirectory = process.env.HOME;

            if (!homeDirectory) {
                log(
                    "There is no credentials file, terminating process",
                    "error"
                );

                process.exit(1);
            }

            const credentialsArray = getVariablesFromFile(
                path.join(homeDirectory, ".aws/credentials")
            );
            const configArray = getVariablesFromFile(
                path.join(homeDirectory, ".aws/config")
            );

            const vars = [...credentialsArray, ...configArray];

            vars.forEach((item) => {
                const [key, value] = item.split(" = ");

                variables.push([key.toUpperCase(), value].join("="));
            });
        } catch (e) {
            console.log(e);
            log(
                "Error while getting either credentials of config. Proceeding without global variables.",
                "error"
            );
            return;
        }
    }

    async function getPrompts() {
        const command = await input(prompts.command);
        const manager = await select(prompts.manager);
        const environment = (await select(prompts.environment)) as
            | "production"
            | "development";

        if (environment === "production") {
            populateWithGlobalVariables();
        }

        log(
            "All the necessary prompts recieved! Proceeding with cdk deploy command"
        );

        return {
            command,
            manager,
            environment,
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

                result.forEach((item) => variables.push(item));

                break;
            }
            case false: {
                log("Output file is not defined. Proceeding with logs reader");
                const result = await executeCommandWithLogsReader(
                    composedCommand
                );

                result.forEach((item) => variables.push(item));

                break;
            }
        }
    }

    function createEnvironmentFile(store: string[]) {
        const parsedStore = store.join("\n");
        const env = {
            production: ".env.production",
            development: ".env.local",
        };
        const envFile = path.join(CALL_DIRECTORY, env[answers.environment]);

        log("Got all key-value pairs, creating .env file", "success");

        writeFileSync(envFile, parsedStore);

        log("I am finished here, terminating process...", "success");
    }

    process.exit(0);
}

init();
