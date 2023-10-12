// Import necessary modules
const fetch = require('node-fetch'); // Used for making HTTP requests
const fs = require('fs'); // Used for file system operations
const path = require('path'); // Used for working with file paths
const open = require('open'); // Used for opening files in the default application

// GitHub repository details
const organizationName = ' '; // GitHub organization or user name
const repoName = ' '; // GitHub repository name
const branchName = ''; // Branch name in the repository
const accessToken = ' '; // GitHub personal access token for authentication

// Directory path within the repository to fetch
const directoryPath = ' '; // Path to the directory you want to fetch

// Asynchronous function to fetch the contents of a GitHub repository directory
async function fetchGitHubRepoContents(directory) {
    const apiUrl = `https://api.github.com/repos/${organizationName}/${repoName}/contents/${directory}`;
    const response = await fetch(`${apiUrl}?ref=${branchName}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    // Check if the response is successful
    if (!response.ok) {
        throw new Error(`Failed to fetch repository contents for ${directory}`);
    }

    // Parse the response JSON data and return it
    const data = await response.json();
    return data;
}

// Asynchronous function to download and save files from GitHub repository contents
async function downloadAndSave(contents, currentPath = '') {
    // Create a downloads folder in the current directory
    const downloadsFolder = path.join(__dirname, 'downloads', currentPath);
    await fs.promises.mkdir(downloadsFolder, { recursive: true });

    const subfolders = [];
    const files = [];

    // Iterate through contents and separate files and subfolders
    for (const contentItem of contents) {
        const filePath = path.join(downloadsFolder, contentItem.name);

        // If the content is a file, add it to the files array
        if (contentItem.type === 'file') {
            files.push({ url: contentItem.download_url, path: filePath });
        } 
        // If the content is a directory, add it to the subfolders array
        else if (contentItem.type === 'dir') {
            subfolders.push({ name: contentItem.name, path: path.join(currentPath, contentItem.name) });
        }
    }

    // Download files asynchronously
    const downloadPromises = files.map(async (file) => {
        const fileContentResponse = await fetch(file.url);
        const fileContent = await fileContentResponse.text();
        await fs.promises.writeFile(file.path, fileContent);
        console.log(`Downloaded and saved: ${file.path}`);
    });

    await Promise.all(downloadPromises);

    // Recursively download contents of subfolders
    for (const subfolder of subfolders) {
        const subfolderContents = await fetchGitHubRepoContents(path.join(directoryPath, subfolder.path));
        await downloadAndSave(subfolderContents, subfolder.path);
    }

    // Check if index.html exists in the downloaded files and open it in the default web browser
    const indexHtmlPath = path.join(downloadsFolder, 'index.html');
    if (files.some(file => file.path.toLowerCase() === indexHtmlPath.toLowerCase())) {
        await open(indexHtmlPath);
        console.log(`Opened index.html in the default web browser.`);
    }
}

// Main function to initiate the download process
async function main() {
    try {
        // Fetch contents of the initial directory and start the download process
        const contents = await fetchGitHubRepoContents(directoryPath);
        await downloadAndSave(contents);
        console.log('Finished downloading files and opening index.html in the default web browser.');
    } catch (error) {
        // Handle errors that occur during the process
        console.error(error);
    }
}

// Call the main function to start the download process
main();
