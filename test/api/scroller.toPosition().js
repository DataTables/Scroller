describe('Scroller - scroller.toPosition()', function() {
	let table;

	dt.libs({
		js: ['jquery', 'datatables', 'scroller'],
		css: ['datatables', 'scroller']
	});

	describe('Check the defaults', function() {
		dt.html('basic');
		it('Exists and is a function', function() {
			table = $('#example').DataTable();
			expect(typeof table.scroller.toPosition).toBe('function');
		});

		it('Returns an API instance', function() {
			expect(table.scroller.toPosition() instanceof $.fn.dataTable.Api).toBe(true);
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

			table.scroller.toPosition(1000, false);
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

			table.scroller.toPosition(1000, false);
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
