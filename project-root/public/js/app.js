const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());

// Configurar body-parser para processar requisições JSON
app.use(bodyParser.json());

// Servir arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Configurar a conexão com o banco de dados MySQL
const dbConfig = {
    host: '54.232.150.39',
    user: 'cliente_crefaz_afortunato',
    password: 'j9X6JVASTo#CzR&n',
    database: 'crefazscm_webscm',
    port: 3313
};

// Função para obter o token
async function getToken() {
    const data = new URLSearchParams({
        grant_type: 'client_credentials',
    });

    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api-prod-local.enelx.com/services/token/oauth2',
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
            username: '9us4qgtu7uw73cdje98z3haa',
            password: 'AMUTdU33hX'
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

// Definir a rota /api/consulta
app.post('/api/consulta', async (req, res) => {
    const operationIds = req.body.operationIds;

    console.log('Operation IDs:', operationIds);

    if (!operationIds || !Array.isArray(operationIds) || operationIds.length === 0) {
        return res.status(400).json({ error: 'IDs de operação são necessários.' });
    }

    try {
        const db = await mysql.createConnection(dbConfig);
        
        const [rows] = await db.query(`
            SELECT
                CAST(op.CODOPERACAO AS UNSIGNED) AS CODOPERACAO,
                REPLACE(FORMAT(op.VL_FACEOP, 2), ',', '.') AS VALOR,
                CASE 
                    WHEN op.CIA_ELETRICA = 73 THEN 2003
                    WHEN op.CIA_ELETRICA = 5 THEN 2005
                    WHEN op.CIA_ELETRICA = 27 THEN 'MT10'
                END AS empresa,
                CAST(op.UNI_CONSUMIDORA_COB AS UNSIGNED) AS numeroCliente,
                CASE
                    WHEN op.CODPRODUTO IN (1, 6) AND op.CIA_ELETRICA = 5 THEN '55032005'
                    WHEN op.CODPRODUTO IN (1, 6) AND op.CIA_ELETRICA = 73 THEN '87012003'
                    WHEN op.CODPRODUTO = 30 AND op.CIA_ELETRICA = 73 THEN '57302003'
                    WHEN op.CODPRODUTO IN (1, 6) AND op.CIA_ELETRICA = 27 THEN '06HB142997'
                    WHEN op.CODPRODUTO = 15 AND op.CIA_ELETRICA = 5 THEN '55042005'
                    WHEN op.CODPRODUTO = 15 AND op.CIA_ELETRICA = 73 THEN '87022003'
                    WHEN op.CODPRODUTO = 15 AND op.CIA_ELETRICA = 27 THEN '06HB582997'
                END AS codProduto_XC,
                op.DATASTATUS AS dataOcorrencia
            FROM
                operacao op
                INNER JOIN clientes cl ON cl.CODCLIENTE = op.CODCLIENTE
                LEFT JOIN rup r ON r.CPFCNPJ = cl.CPFCNPJ
                LEFT JOIN ciaeletrica cia ON cia.CODCIAELETRICA = op.CIA_ELETRICA
            WHERE
                op.CODOPERACAO IN (?)
            GROUP BY op.CODOPERACAO
            ORDER BY op.CODOPERACAO ASC
        `, [operationIds]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Nenhum registro encontrado.' });
        }

        const token = await getToken();
        console.log(token);

        const resultPromises = rows.map(async (record) => {
            try {
                const response = await axios.get(`https://api-prod-local.enelx.com/services/bdp/v1/subscription-history?empresa=${record.empresa}&numeroCliente=${record.numeroCliente}&empresaParc=BRA-Crefaz&codProduto=${record.codProduto_XC}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json; charset=UTF-8',
                        'Operation': 'Read',
                        'Functionality': 'Read',
                        'ClientSystem': 'BRA-Crefaz',
                        'ServerSystem': 'XCustomerB2CBR'
                    }
                });

                const apiData = response.data;
                console.log(apiData);

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
