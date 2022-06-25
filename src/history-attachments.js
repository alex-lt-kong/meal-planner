const $ = require('jquery');
const dt = require('datatables.net')();

$('#table_id').DataTable( {
  ajax: {
    url: './get-all-attachments/',
    dataSrc: 'data'
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
        `<a href="./get-attachment/?date=${row['date']}&filename=${data}" ` +
        `target="_blank" style="text-decoration: none;">${data}</a>`
      );
    }
  }]
});
