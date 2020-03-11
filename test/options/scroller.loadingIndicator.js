describe('Scroller - scroller.loadingIndicator', function() {
	var table;

	dt.libs({
		js: ['jquery', 'datatables', 'scroller'],
		css: ['datatables', 'scroller']
	});

	describe('Functional tests', function() {
		dt.html('empty');
		it('Returns undefined if no scrolling', function(done) {
			table = $('#example').DataTable({
				serverSide: true,
				ajax: function(data, callback, settings) {
					var out = [];

					for (let i = data.start, ien = data.start + data.length; i < ien; i++) {
						out.push([i + '-1', i + '-2', i + '-3', i + '-4', i + '-5', i + '-6']);
					}

					setTimeout(function() {
						callback({
							draw: data.draw,
							data: out,
							recordsTotal: 5000,
							recordsFiltered: 5000
						});
					}, 50);
				},
				initComplete: function(setting, json) {
					done();
				},
				language: {
					loadingRecords: 'Please wait - loading...'
				},

				deferRender: true,
				scrollY: 200,
				scrollCollapse: true,
				scroller: {
					loadingIndicator: true,
					displayBuffer: 20
				}
			});
		});

		it('Returns undefined if no scrolling', function() {
			table.row(400).scrollTo(false);
		});
	});
});
