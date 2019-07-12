describe('Select - scroller.page()', function() {
	var table;

	dt.libs({
		js: ['jquery', 'datatables', 'scroller'],
		css: ['datatables', 'scroller']
	});

	describe('Check the defaults', function() {
		dt.html('basic');
		let table;
		it('Exists and is a function', function() {
			table = $('#example').DataTable();
			expect(typeof table.scroller.page).toBe('function');
		});
		it('Returns undefined if no scrolling', function() {
			expect(typeof table.scroller.page()).toBe('undefined');
		});

		dt.html('basic');
		it('Returns undefined if no scrolling', function() {
			table = $('#example').DataTable({
				deferRender: true,
				scrollY: 200,
				scrollCollapse: true,
				scroller: true
			});
			expect(typeof table.scroller.page()).toBe('object');
		});
	});

	describe('Check the behaviour - linear scrolling', function() {
		dt.html('empty');
		let table;
		it('Scroll to line 1000', function() {
			let data = [];
			for (var i = 0; i < 5000; i++) {
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

			let page = table.scroller.page();
			expect(page.start).toBe(1000);
			expect(page.end).toBe(1005);
		});
	});
});
