/*! Scroller for DataTables
 * Copyright (c) SpryMedia Ltd - datatables.net/license
 */

import DataTable, { Api, Config, Dom, util } from 'datatables.net';
import Scroller from './Scroller';

// Attach Scroller to DataTables so it can be accessed as an 'extra'
DataTable.Scroller = Scroller;

Api.register('scroller()', function () {
	return this.inst(this.context);
});

// Undocumented and deprecated - is it actually useful at all?
Api.register('scroller().rowToPixels()', function (rowIdx, intParse, virtual) {
	var ctx = this.context;

	if (ctx.length && ctx[0].scroller) {
		return ctx[0].scroller.rowToPixels(rowIdx, intParse, virtual);
	}
	// undefined
});

// Undocumented and deprecated - is it actually useful at all?
Api.register('scroller().pixelsToRow()', function (pixels, intParse, virtual) {
	var ctx = this.context;

	if (ctx.length && ctx[0].scroller) {
		return ctx[0].scroller.pixelsToRow(pixels, intParse, virtual);
	}
	// undefined
});

// `scroller().scrollToRow()` is undocumented and deprecated. Use
// `scroller.toPosition()
['scroller().scrollToRow()', 'scroller.toPosition()'].forEach(name => {
	Api.register(name, function (idx, ani) {
		this.iterator('table', function (ctx) {
			if (ctx.scroller) {
				ctx.scroller.scrollToRow(idx, ani);
			}
		});

		return this;
	});
});

Api.register('row().scrollTo()', function (ani) {
	var that = this;

	this.iterator('row', function (ctx, rowIdx) {
		if (ctx.scroller) {
			var displayIdx = that
				.rows({ order: 'applied', search: 'applied' })
				.indexes()
				.indexOf(rowIdx);

			ctx.scroller.scrollToRow(displayIdx, ani);
		}
	});

	return this;
});

Api.register('scroller.measure()', function (redraw) {
	this.iterator('table', function (ctx) {
		if (ctx.scroller) {
			ctx.scroller.measure(redraw);
		}
	});

	return this;
});

Api.register('scroller.page()', function () {
	var ctx = this.context;

	if (ctx.length && ctx[0].scroller) {
		return ctx[0].scroller.pageInfo();
	}
	// undefined
});

// Attach a listener to the document which listens for DataTables initialisation
// events so we can automatically initialise
Dom.s(document).on('preInit.dt.dtscroller', function (e, settings) {
	if (e.namespace !== 'dt') {
		return;
	}

	let init = (settings.init as any).scroller as boolean | Config;
	let defaults = (DataTable.defaults as any).scroller as
		| boolean
		| Config;

	if (init || defaults) {
		let opts: Config = {};

		if (util.is.plainObject(defaults)) {
			util.object.assign(opts, defaults);
		}

		if (util.is.plainObject(init)) {
			util.object.assign(opts, init);
		}

		if (init !== false) {
			new Scroller(settings, opts);
		}
	}
});
