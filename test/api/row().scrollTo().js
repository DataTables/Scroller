describe('Scroller - row().scrollTo()', function() {
	dt.libs({
		js: ['jquery', 'datatables', 'scroller'],
		css: ['datatables', 'scroller']
	});

	let table;

	describe('Check the defaults', function() {
		dt.html('basic');
		it('Exists and is a function', function() {
			table = $('#example').DataTable();
			expect(typeof table.row().scrollTo).toBe('function');
		});
		it('Returns an API instance', function() {
			expect(table.row(0).scrollTo() instanceof $.fn.dataTable.Api).toBe(true);
		});
	});

	describe('Check the behaviour - small tables', function() {
		dt.html('basic');
		it('Can scroll to near the end', function() {
			table = $('#example').DataTable({
				deferRender: true,
				scrollY: 200,
				scrollCollapse: true,
				scroller: true,
				ordering: false
			});
			table.row(50).scrollTo(false);
		});
		it('And confirm there', async function(done) {
			dt.sleep(1000).then(() => {
				let rowCount = $('#example tbody tr').length - 1;

				expect($('#example tbody tr:eq(0) td:eq(0)').text()).toBe('Cedric Kelly');
				expect($('#example tbody tr:eq(' + parseInt(rowCount) + ') td:eq(0)').text()).toBe('Donna Snider');

				expect($('.dataTables_info, .dt-info').text()).toBe('Showing 51 to 56 of 57 entries');
				done();
			});
		});
		it('Can scroll back to start', function() {
			table.row(2).scrollTo(false);
		});
		it('And confirm there', async function(done) {
			dt.sleep(1000).then(() => {
				let rowCount = $('#example tbody tr').length - 1;

				expect($('#example tbody tr:eq(0) td:eq(0)').text()).toBe('Tiger Nixon');
				expect($('#example tbody tr:eq(' + parseInt(rowCount) + ') td:eq(0)').text()).toBe('Jonas Alexander');

				expect($('.dataTables_info, .dt-info').text()).toBe('Showing 3 to 8 of 57 entries');
				done();
			});
		});

		dt.html('basic_container');
		it('Can scroll near the start', function() {
			table = $('#example').DataTable({
				deferRender: true,
				scrollX: true,
				scrollY: 200,
				scrollCollapse: true,
				scroller: true,
				ordering: false
			});

			table.row(11).scrollTo(false);
		});
		it('And confirm there', async function(done) {
			dt.sleep(1000).then(() => {
				let rowCount = $('#example tbody tr').length - 1;

				expect($('#example tbody tr:eq(0) td:eq(0)').text()).toBe('Tiger Nixon');
				expect($('#example tbody tr:eq(' + parseInt(rowCount) + ') td:eq(0)').text()).toBe('Jonas Alexander');

				expect($('.dataTables_info, .dt-info').text()).toBe('Showing 12 to 17 of 57 entries');
				done();
			});
		});
	});

	describe('Check the behaviour - linear scrolling', function() {
		dt.html('empty');
		it('Scroll to line 1000', function() {
			let data = [];
			for (let i = 0; i < 5000; i++) {
				data.push([i, i, i, i, i, i]);
			}

			table = $('#example').DataTable({
				data: data,
				deferRender: true,
				scrollY: 200,
				scrollCollapse: true,
				scroller: true
			});

			table.row(1000).scrollTo(false);
		});
		it('And confirm there', async function(done) {
			dt.sleep(1000).then(() => {
				let rowCount = $('#example tbody tr').length;
				let visibleRows = 6;
				let halfway = parseInt((rowCount - visibleRows) / 2);

				expect($('#example tbody tr:eq(' + halfway + ') td:eq(0)').text()).toBe('1000');
				expect($('.dataTables_info, .dt-info').text()).toBe('Showing 1,001 to 1,006 of 5,000 entries');
				done();
			});
		});
	});

	describe('Check the behaviour - non-linear', function() {
		dt.html('empty');
		it('Scroll to line 1000', function() {
			let data = [];
			for (let i = 0; i < 50000; i++) {
				data.push([i, i, i, i, i, i]);
			}

			table = $('#example').DataTable({
				data: data,
				deferRender: true,
				scrollY: 200,
				scrollCollapse: true,
				scroller: true
			});

			table.row(1000).scrollTo(false);
		});
		it('And confirm there', async function(done) {
			dt.sleep(1000).then(() => {
				let rowCount = $('#example tbody tr').length;
				let visibleRows = 6;
				let halfway = parseInt((rowCount - visibleRows) / 2);

				expect($('#example tbody tr:eq(' + halfway + ') td:eq(0)').text()).toBe('1000');
				done();
			});
		});
	});
});
