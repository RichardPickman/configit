export const getVariablesFromStringOutput = (text: string) =>
    text.split("\n").filter((item) => item.includes(" = "));

export const getFormattedVariable = (text: string) => {
    const [key, value] = text.split(".")[1].split("=");
    const formattedKey = convertCamelCaseToSnakeCase(key);

    return [formattedKey, value.trim()].join("=");
};

export const convertCamelCaseToSnakeCase = (text: string) => {
    const letters = text.trim();
    let result = "";

    for (let i = 0; i < letters.length; i++) {
        const letter = letters[i];
        if (letter === letter.toUpperCase()) {
            result += `_${letter}`;
        } else {
            result += letter.toUpperCase();
        }
    }

    return result;
};
