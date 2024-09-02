const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');


require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const app = express();
const port = 3000;

app.use(cors());

// Configurar body-parser para processar requisições JSON
app.use(bodyParser.json());

// Servir arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Configurar a conexão com o banco de dados MySQL
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
};



// Função para obter o token
async function getToken() {
    const data = new URLSearchParams({
        grant_type: process.env.API_GRANT_TYPE,
    });

    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url:process.env.API_URL_TOKEN,
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
            username: process.env.API_USER,
            password: process.env.API_PASSWORD
        },
        data: data.toString()
    };

    try {
        const response = await axios(config);
        return response.data.access_token;
    } catch (error) {
        console.error('Erro ao obter o token:', error.message);
        throw error;
    }
}


// Função para ler a consulta SQL do arquivo
async function getQuery() {
    try {
        const queryPath = path.join(__dirname, '..','..', 'sql', 'query.sql');
        const query = await fs.readFile(queryPath, 'utf8');
        return query;
    } catch (error) {
        console.error('Erro ao ler o arquivo de consulta SQL:', error.message);
        throw error;
    }
}



// Definir a rota /api/consulta
app.post('/api/consulta', async (req, res) => {
    const operationIds = req.body.operationIds;

    console.log('Operation IDs:', operationIds);

    if (!operationIds || !Array.isArray(operationIds) || operationIds.length === 0) {
        return res.status(400).json({ error: 'IDs de operação são necessários.' });
    }

    try {
        const db = await mysql.createConnection(dbConfig);

        // Obter a query SQL do arquivo
        const sqlQuery = await getQuery();
        
        const [rows] = await db.query(sqlQuery, [operationIds]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Nenhum registro encontrado.' });
        }

        const token = await getToken();

        const resultPromises = rows.map(async (record) => {
            try {
                const response = await axios.get(process.env.API_URL_CONSULTA, {
                    params: {
                        empresa: record.empresa,
                        numeroCliente: record.numeroCliente,
                        empresaParc: 'BRA-Crefaz',
                        codProduto: record.codProduto_XC
                    }, 
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json; charset=UTF-8',
                        'Operation': 'Read',
                        'Functionality': 'Read',
                        'ClientSystem': process.env.EMPRESA_PARC,
                        'ServerSystem': process.env.SERVER_SYSTEM
                    }
                });

                const apiData = response.data;

                if (Array.isArray(apiData)) {
                    const filteredResults = apiData.filter(item => parseFloat(item.valor) === parseFloat(record.VALOR));

                    if (filteredResults.length > 0) {
                        return filteredResults;
                    } else {
                        console.log('Nenhum resultado correspondente na API para o valor:', record.VALOR);
                        return { resultado: 'Nenhum resultado correspondente na API para o valor:'};
                    }
                } else {
                    console.log('Resposta da API não é um array:', apiData);
                    return { resultado: 'Resposta da API não é um array:', apiData};;
                }
            } catch (apiError) {
                console.error('Erro ao consultar a API externa:', apiError.message);
                return { error: 'Erro ao consultar a API externa.' };
            }
        });

        const resultsFromApi = await Promise.all(resultPromises);
        const filteredResultsFromApi = resultsFromApi.filter(result => result !== null).flat();
        res.json(filteredResultsFromApi);

    } catch (err) {
        console.error('Erro ao consultar o banco de dados:', err.message);
        res.status(500).json({ error: 'Erro ao consultar o banco de dados.' });
    }
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
