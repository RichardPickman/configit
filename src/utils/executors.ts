import { execSync, spawn } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

const CALL_DIRECTORY = process.cwd();

const convertCamelCaseToSnakeCase = (text: string) => {
    const letters = text.trim();
    let result = '';

    for (let i = 0; i < letters.length; i++) {
        const letter = letters[i]
        if (letter === letter.toUpperCase()) {
            result += `_${letter}`;
        } else {
            result += letter.toUpperCase();
        }
    }

    return result;
}

const getFormattedVariable = (text: string) => {
    const [key, value] = text.split('.')[1].split('=');
    const formattedKey = convertCamelCaseToSnakeCase(key);

    return [formattedKey, value.trim()].join('=');
}

const getCommandOutputs = (command: string) => new Promise<string[]>((resolve, reject) => {
    const childProcess = spawn(command, { cwd: CALL_DIRECTORY, shell: true });
    let outputs = '';

    childProcess.stderr.on('data', (data) => outputs += data.toString());
    childProcess.stdout.on('data', (data) => outputs += data.toString());
    childProcess.on('close', (code) => {
        if (code === 0) {
            const variables = outputs.split('\n').filter((item) => item.includes(' = '));

            resolve(variables.map(getFormattedVariable));
        } else {
            reject([]);
        }
    });
})

export const executeCommandWithFileReader = (command: string, fileName: string) => {
    console.log('Calling cdk deploy...');
    
    execSync(command, { cwd: CALL_DIRECTORY });

    const filePath = path.join(CALL_DIRECTORY, fileName);

    try {
        const data = JSON.parse(readFileSync(filePath, 'utf8'));
        const [stackKey] = Object.keys(data);

        const result = [];

        for (let [key, value] of Object.entries(data[stackKey])) {
            const formattedKey = convertCamelCaseToSnakeCase(key);
            result.push([formattedKey, value].join('='));
        }
        
        return result;
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

export const executeCommandWithLogsReader = async (command: string) => {
    try {
        const outputs = await getCommandOutputs(command);

        if (outputs.length === 0) {
            throw new Error('No variables found by logs reader');
        }
    
        return outputs;
    } catch(e) {
        console.error(e);

        process.exit(1);
    }
}