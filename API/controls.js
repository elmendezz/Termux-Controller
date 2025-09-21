// Version: 1
// Changelog:
// - Version 1: Initial release with serverless function to handle GitHub API calls securely.
//
import fetch from "node-fetch";

// Asegúrate de que este token esté en las variables de entorno de Vercel.
// En Vercel, ve a Settings > Environment Variables y añade una variable GITHUB_TOKEN.
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Verifica si la variable de entorno está configurada
if (!GITHUB_TOKEN) {
  console.error("Error: GITHUB_TOKEN no está configurada en las variables de entorno de Vercel.");
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Método no permitido' });
  }

  const { command, user, repo } = request.body;
  if (!command || !user || !repo) {
    return response.status(400).json({ message: 'Parámetros faltantes' });
  }

  try {
    // 1. Obtener el SHA del archivo commands.txt para poder actualizarlo
    const fileUrl = `https://api.github.com/repos/${user}/${repo}/contents/commands.txt`;
    const getFileResponse = await fetch(fileUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const fileData = await getFileResponse.json();
    const sha = fileData.sha;

    // 2. Actualizar el contenido del archivo commands.txt
    const updateResponse = await fetch(fileUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Comando enviado desde Vercel: ${command}`,
        content: Buffer.from(command).toString('base64'),
        sha: sha
      })
    });

    if (updateResponse.ok) {
      response.status(200).json({ message: 'Comando enviado, esperando la respuesta...' });
    } else {
      const errorData = await updateResponse.json();
      response.status(updateResponse.status).json({ message: 'Error de la API de GitHub', details: errorData });
    }

  } catch (error) {
    console.error('Error en la función serverless:', error);
    response.status(500).json({ message: 'Ocurrió un error en el servidor', error: error.message });
  }
          }
