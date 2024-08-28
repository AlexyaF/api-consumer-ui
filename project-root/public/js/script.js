
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}



function createTable(data) {

    const table = document.createElement('table' );
    table.classList.add('table')
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const headers = Object.keys(data[0]); // colunas, puxa o nome de todas as chaves do primeiro objeto
    const headersUpdate =  headers.map(item => 
        item
        .replace(/estado/g, 'Estado')
        .replace(/UnidadeConsumidora/g, 'Unidade Consumidora')
        .replace(/valorParcela/g, 'Valor Parcela')
        .replace(/dataPagamento/g, 'Data Pagamento')
        .replace(/dataCancelamento/g, 'Data Cancelamento')
    );

    const headerRow = document.createElement('tr'); // cria uma linha

    // para cada chave cirar uma coluna com o nome correspondente
    headersUpdate.forEach(headerText => {
        const colum = document.createElement('th'); // é criado uma coluna 
        colum.textContent = headerText; // adiciona o nome da coluna dentro do objeto coluna *th*
        headerRow.appendChild(colum); // linha recebe a coluna
    });

    thead.appendChild(headerRow); // cabeçalho da tabela recebe a linha das colunas
    table.appendChild(thead); // tabela recebe cabeçalho

    data.forEach(item => {
        const row = document.createElement('tr'); // cria linha

        headers.forEach(key => {
            const cell = document.createElement('td'); //cria celula
            cell.textContent = item[key]; // celula recebe item correspondente ao nome da chavedentro do loop
            row.appendChild(cell); //linha recebe a celula;
        });

        tbody.appendChild(row) // tabela recebe linha
    });

    table.appendChild(tbody);
    return table;
}


async function consultar() {
    const operationIds = document.getElementById('operationIds').value.split(',').map(id => id.trim());
    const response = await fetch('http://localhost:3000/api/consulta', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ operationIds })
    });

    const result = await response.json();

    if (!result || result.length === 0 || result.every(item => item === null)) {
        document.getElementById('result').textContent = "Contrato não localizado";
        return;
    }

    // Filtrar campos
    const filteredResults = result.flat().map(item => ({
        estado: item.estado,
        UnidadeConsumidora: item.numeroCliente,
        valorParcela: item.valor,
        dataPagamento: formatDate(item.dataAdesao),
        dataCancelamento: formatDate(item.dataCancelamento) 
    }));

    // // Formatar os resultados 
    // const formattedResults = filteredResults.map(item =>
    //     `Estado: ${item.estado}\nUnidade Consumidora: ${item.UnidadeConsumidora}\nValor Parcela: ${item.valorParcela}\nData Pagamento: ${item.dataPagamento} \nData Cancelamento: ${item.dataCancelamento}`).join('\n\n');

    
    const finalResults = createTable(filteredResults);

    // Limpa qualquer conteúdo existente e adiciona a nova tabela
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = ''; // Limpa o conteúdo anterior
    resultDiv.appendChild(finalResults); // Adiciona a nova tabela

}