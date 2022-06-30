const $ = require('jquery');
const dt = require('datatables.net')();
import React from 'react';
import {createRoot} from 'react-dom/client';
import {TopNavBar} from './navbar';

$('#table_id').DataTable( {
  ajax: {
    url: './get-all-attachments/',
    dataSrc: 'data'
  },
  responsive: true,
  oLanguage: {
    sSearch: '搜索:',
    sInfo: '共_TOTAL_项',
    sInfoFiltered: '',
    oPaginate: {
      sNext: '下页',
      sPrevious: '上页'
    }
  },
  lengthChange: false,
  order: [[0, 'desc']],
  columns: [
    {data: 'date'},
    {data: 'filename'}
  ],
  columnDefs: [{
    targets: 1,
    render: (data, type, row, meta) => {
      return (
        `<a class="text-dark" href="./get-attachment/?date=${row['date']}&filename=${data}" ` +
        `target="_blank" style="text-decoration: none;">${data}</a>`
      );
    }
  }]
});


const container = document.getElementById('root-navbar');
const root = createRoot(container); // createRoot(container!) if you use TypeScript

root.render(<TopNavBar />);
