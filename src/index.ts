import { input, select } from '@inquirer/prompts';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { executeCommandWithFileReader, executeCommandWithLogsReader } from './utils/executors';
import { getOutputFileName, isOutputExist } from './utils/outputs';

const CALL_DIRECTORY = process.cwd();

const getPrompts = async () => {
    const command = await input({ message: 'What is the command?' });
    const manager = await select({ message: 'Package manager:', choices: [
        {
            name: 'yarn',
            value: 'yarn ',
        },
        {
            name: 'npm',
            value: 'npm run ',
        },
        {
            name: 'pnpm',
            value: 'pnpm ',
        },
    ], });

    console.log('All the necessary prompts recieved! Proceeding with cdk deploy command');

    return {
        command,
        manager
    }
};

const getScriptString = (command: string) => {
    const filePath = path.join(CALL_DIRECTORY, 'package.json');
    const result = JSON.parse(readFileSync(filePath, 'utf-8'));
    const isScriptExist = Object.keys(result.scripts).includes(command);
  
    if (!isScriptExist) {
        console.log('There is no provided script');
        process.exit(1);
    }

    return result.scripts[command];
}

const callCDK = async (command: string, packageManager: string) => {
    console.log('Getting script line...');

    const script = getScriptString(command);

    console.log('Script line recieved, proceeding with command: ', script);

    const isOutput = isOutputExist(script);
    const composedCommand = packageManager + command;

    console.log('Is output present in script line: ', isOutput);

    switch (isOutput) {
        case true: {
            const fileName = getOutputFileName(script);

            console.log('Output file exist. Filename is: ', fileName);
            
            const result = executeCommandWithFileReader(composedCommand, fileName);
            
            return result;
        }
        case false: {
            console.log('Output file is not defined. Proceeding with logs reader');
            const result = executeCommandWithLogsReader(composedCommand);

            return result;
        }
    }
}

const createEnvironmentFile = (store: string[]) => {
    const parsedStore = store.join('\n');
    const envFile = path.join(CALL_DIRECTORY, '.env');

    console.log('Got all key-value pairs, creating .env file');

    writeFileSync(envFile, parsedStore);

    console.log('.env file created');
    console.log('I am finished here, terminating process...');
}

const init = async () => {
    const prompts = await getPrompts();
    const generatedValues = await callCDK(prompts.command, prompts.manager);

    console.log('All values recieved without errors. Final variables: ', generatedValues);

    createEnvironmentFile(generatedValues);

    process.exit(1);
};

init();