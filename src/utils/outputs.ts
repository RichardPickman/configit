import path from 'path';

const OUTPUT_COMMAND = '--outputs-file';

export const isOutputExist = (script: string) => script.split(' ').includes(OUTPUT_COMMAND);

export const getOutputFileName = (command: string) => {
    const commands = command.split(' ');
    const fileIndex = commands.findIndex((item) => OUTPUT_COMMAND === item);

    return path.basename(commands[fileIndex + 1]);
}