import DataTable, { Api, Config, Context } from 'datatables.net';
import { Defaults, DomInternal, Settings } from './interface';

if (!DataTable || !DataTable.versionCheck || !DataTable.versionCheck('3')) {
	throw 'Warning: AutoFill requires DataTables 3 or greater';
}

const dom = DataTable.dom;
const util = DataTable.util;

/**
 * Scroller is a virtual rendering plug-in for DataTables which allows large
 * datasets to be drawn on screen very quickly. What the virtual rendering means
 * is that only the visible portion of the table (and a bit to either side to
 * make the scrolling smooth) is drawn, while the scrolling container gives the
 * visual impression that the whole table is visible. This is done by making use
 * of the pagination abilities of DataTables and moving the table around in the
 * scrolling container DataTables adds to the page. The scrolling container is
 * forced to the height it would be for the full table display using an extra
 * element.
 *
 * Note that rows in the table MUST all be the same height. Information in a
 * cell which expands on to multiple lines will cause some odd behaviour in the
 * scrolling.
 *
 * Key features include:
 *
 * * Speed! The aim of Scroller for DataTables is to make rendering large data
 *   sets fast
 * * Full compatibility with deferred rendering in DataTables for maximum speed
 * * Display millions of rows
 * * Integration with state saving in DataTables (scrolling position is saved)
 * * Easy to use
 */
export default class Scroller {
	public static defaults: Defaults = {
		boundaryScale: 0.5,
		displayBuffer: 9,
		rowHeight: 'auto',
		serverWait: 200
	};

	/**
	 * Scroller version
	 */
	public static version = '2.4.3';

	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
	 * Public methods - to be exposed via the DataTables API
	 */

	/**
	 * Calculate and store information about how many rows are to be displayed
	 * in the scrolling viewport, based on current dimensions in the browser's
	 * rendering. This can be particularly useful if the table is initially
	 * drawn in a hidden element - for example in a tab.
	 *
	 * @param redraw Redraw the table automatically after the recalculation,
	 *   with the new dimensions forming the basis for the draw.
	 */
	public measure(redraw = true) {
		if (this.s.autoHeight) {
			this._calcRowHeight();
		}

		var heights = this.s.heights;

		if (heights.row) {
			heights.viewport = this._parseHeight(
				this.dom.scroller.css('max-height')
			);

			this.s.viewportRows =
				Math.floor(heights.viewport / heights.row) + 1;
			this.s.dt.pageLength = this.s.viewportRows * this.c.displayBuffer;
		}

		var label = this.dom.label.height('outer');

		heights.labelHeight = label;
		heights.xbar =
			this.dom.scroller.get(0).offsetHeight -
			this.dom.scroller.get(0).clientHeight;

		if (redraw === undefined || redraw) {
			this.s.dtApi.draw(false);
		}
	}

	/**
	 * Get information about current displayed record range. This corresponds to
	 * the information usually displayed in the "Info" block of the table.
	 *
	 * @returns Display information object
	 */
	public pageInfo() {
		let scrollTop = this.dom.scroller.scrollTop(),
			total = this.s.dtApi.page.info().recordsDisplay,
			possibleEnd = Math.ceil(
				this.pixelsToRow(
					scrollTop + this.s.heights.viewport,
					false,
					this.s.ani
				)
			);

		return {
			start: Math.floor(this.pixelsToRow(scrollTop, false, this.s.ani)),
			end: total < possibleEnd ? total - 1 : possibleEnd - 1
		};
	}

	/**
	 * Calculate the row number that will be found at the given pixel position
	 * (y-scroll).
	 *
	 * Please note that when the height of the full table exceeds 1 million
	 * pixels, Scroller switches into a non-linear mode for the scrollbar to fit
	 * all of the records into a finite area, but this function returns a linear
	 * value (relative to the last non-linear positioning).
	 *
	 * @param pixels Offset from top to calculate the row number of
	 * @param intParse If an integer value should be returned
	 * @param virtual Perform the calculations in the virtual domain
	 * @returns Row index
	 */
	private pixelsToRow(
		pixels: number,
		intParse: boolean = true,
		virtual: boolean = false
	) {
		var diff = pixels - this.s.baseScrollTop;
		var row = virtual
			? (this._domain('physicalToVirtual', this.s.baseScrollTop) + diff) /
			  this.s.heights.row
			: diff / this.s.heights.row + this.s.baseRowTop;

		return intParse || intParse === undefined ? row : row;
	}

	/**
	 * Calculate the pixel position from the top of the scrolling container for
	 * a given row
	 *
	 * @param rowIdx Row number to calculate the position of
	 * @param intOnly Return just an integer (default = true)
	 * @param virtual Make a virtual calculation
	 * @returns Pixels
	 */
	private rowToPixels(rowIdx: number, intOnly?: boolean, virtual?: boolean) {
		var pixels;
		var diff = rowIdx - this.s.baseRowTop;

		if (virtual) {
			pixels = this._domain('virtualToPhysical', this.s.baseScrollTop);
			pixels += diff * this.s.heights.row;
		}
		else {
			pixels = this.s.baseScrollTop;
			pixels += diff * this.s.heights.row;
		}

		return intOnly || intOnly === undefined
			? Math.floor(pixels)
			: pixels;
	}

	/**
	 * Calculate the row number that will be found at the given pixel position
	 * (y-scroll)
	 *
	 * @param row Row index to scroll to
	 * @param animate Animate the transition or not
	 */
	private scrollToRow(row: number, animate: boolean = true) {
		var that = this;
		var ani = false;
		var px = this.rowToPixels(row);
		var pageInfo = this.s.dtApi.page.info();

		// We need to know if the table will redraw or not before doing the
		// scroll. If it will not redraw, then we need to use the currently
		// displayed table, and scroll with the physical pixels. Otherwise, we
		// need to calculate the table's new position from the virtual
		// transform.
		var preRows = ((this.c.displayBuffer - 1) / 2) * this.s.viewportRows;
		var drawRow = row - preRows;

		if (drawRow < 0) {
			drawRow = 0;
		}

		if (
			(px > this.s.redrawBottom || px < this.s.redrawTop) &&
			pageInfo.start !== drawRow
		) {
			ani = true;
			px = this._domain('virtualToPhysical', row * this.s.heights.row);

			// If we need records outside the current draw region, but the new
			// scrolling position is inside that (due to the non-linear nature
			// for larger numbers of records), we need to force position update.
			if (this.s.redrawTop < px && px < this.s.redrawBottom) {
				this.s.forceReposition = true;
				animate = false;
			}
		}

		// if (animate === undefined || animate) {
		// 	this.s.ani = ani;
		// 	this.dom.scroller.animate(
		// 		{
		// 			scrollTop: px
		// 		},
		// 		function () {
		// 			// This needs to happen after the animation has completed
		// 			// and the final scroll event fired
		// 			setTimeout(function () {
		// 				that.s.ani = false;
		// 			}, 250);
		// 		}
		// 	);
		// }
		// else {
			this.dom.scroller.scrollTop(px);
		// }
	}

	private c: Defaults;
	private dom: DomInternal;
	private s: Settings;

	constructor(dt: Api | Context, opts: Config) {
		if (opts === undefined) {
			opts = {};
		}

		var dtApi = new DataTable.Api(dt);

		this.s = {
			ani: false,
			dt: dtApi.settings()[0],
			dtApi: dtApi,
			tableTop: 0,
			tableBottom: 0,
			redrawTop: 0,
			redrawBottom: 0,
			autoHeight: true,
			viewportRows: 0,
			stateTO: null,
			stateSaveThrottle: function () {},
			drawTO: null,
			heights: {
				jump: 0,
				page: 0,
				virtual: 0,
				scroll: 0,
				row: 0,
				viewport: 0,
				labelHeight: 0,
				xbar: 0
			},
			topRowFloat: 0,
			scrollDrawDiff: null,
			labelVisible: false,
			forceReposition: false,
			baseRowTop: 0,
			baseScrollTop: 0,
			mousedown: false,
			lastScrollTop: 0,
			ignoreScroll: false,
			scrollType: 'cont',
			skip: false,
			targetTop: 0
		};

		// Configurable options
		this.c = util.object.assign({}, Scroller.defaults, opts);

		let scroller = dom.s(
			this.s.dtApi.table().node().parentNode as HTMLElement
		);

		this.dom = {
			force: dom.c('div'),
			label: dom.c('div').classAdd('dts_label').text('0'),
			scroller: scroller,
			table: scroller.children('table').eq(0)
		};

		// Attach the instance to the DataTables instance so it can be accessed
		// in future. Don't initialise Scroller twice on the same table
		if (this.s.dt.scroller) {
			return;
		}

		this.s.dt.scroller = this;

		/* Let's do it */
		this._init();
	}

	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
	 * Private methods
	 */

	/**
	 * Initialisation for Scroller
	 */
	private _init() {
		var that = this;
		var dt = this.s.dtApi;

		// Sanity check
		if (!this.s.dt.features.paging) {
			throw new Error(
				'Pagination must be enabled for Scroller to operate'
			);
		}

		// Insert a div element that we can use to force the DT scrolling
		// container to the height that would be required if the whole table was
		// being displayed
		this.dom.force.css({
			position: 'relative',
			top: '0',
			left: '0',
			width: '1px'
		});

		this.dom.scroller.append(this.dom.force).css('position', 'relative');

		this.dom.table.css({
			position: 'absolute',
			top: '0',
			left: '0'
		});

		// Add class to 'announce' that we are a Scroller table
		dom.s(dt.table().container()).classAdd('dts');

		this.dom.label.appendTo(this.dom.scroller);

		// Initial size calculations
		if (this.c.rowHeight == 'auto') {
			this.s.autoHeight = true;
		}
		else {
			this.s.heights.row = this._parseHeight(this.c.rowHeight);
		}

		// Scrolling callback to see if a page change is needed
		this.s.ignoreScroll = true;
		this.dom.scroller.on('scroll.dt-scroller', function (e) {
			that._scroll.call(that);
		});

		// In iOS we catch the touchstart event in case the user tries to scroll
		// while the display is already scrolling
		this.dom.scroller.on('touchstart.dt-scroller', function () {
			that._scroll.call(that);
		});

		this.dom.scroller
			.on('mousedown.dt-scroller', function () {
				that.s.mousedown = true;
			})
			.on('mouseup.dt-scroller', function () {
				that.s.labelVisible = false;
				that.s.mousedown = false;
				that.dom.label.css('display', 'none');
			});

		// On resize, update the information element, since the number of rows
		// shown might change
		dom.w.on('resize.dt-scroller', function () {
			that.measure(false);
			that._info();
		});

		// Add a state saving parameter to the DT state saving so we can restore
		// the exact position of the scrolling.
		var initialStateSave = true;
		var loadedState = dt.state.loaded();

		dt.on('stateSaveParams.scroller', function (e, settings, data) {
			if (initialStateSave && loadedState) {
				data.scroller = loadedState.scroller;
				initialStateSave = false;

				if (data.scroller) {
					that.s.lastScrollTop = data.scroller.scrollTop;
				}
			}
			else {
				// Need to used the saved position on init
				data.scroller = {
					topRow: that.s.topRowFloat,
					baseRowTop: that.s.baseRowTop
				};
			}
		});

		dt.on('stateLoadParams.scroller', function (e, settings, data) {
			if (data.scroller !== undefined) {
				that.scrollToRow(data.scroller.topRow);
			}
		});

		this.measure(false);

		if (loadedState && loadedState.scroller) {
			this.s.topRowFloat = loadedState.scroller.topRow;
			this.s.baseRowTop = loadedState.scroller.baseRowTop;

			// Reconstruct the scroll positions from the rows - it is possible
			// the row height has changed e.g. if the styling framework has
			// changed. The scroll top is used in `_draw` further down.
			this.s.baseScrollTop = this.s.baseRowTop * this.s.heights.row;
			loadedState.scroller.scrollTop = this._domain(
				'physicalToVirtual',
				this.s.topRowFloat * this.s.heights.row
			);
		}

		that.s.stateSaveThrottle = DataTable.util.throttle(function () {
			that.s.dtApi.state.save();
		}, 500);

		dt.on('init.scroller', function () {
			that.measure(false);

			// Setting to `jump` will instruct _draw to calculate the scroll top
			// position
			that.s.scrollType = 'jump';
			that._draw();

			// Update the scroller when the DataTable is redrawn
			dt.on('draw.scroller', function () {
				that._draw();
			});
		});

		// Set height before the draw happens, allowing everything else to
		// update on draw complete without worry for roder.
		dt.on('preDraw.dt.scroller', function () {
			that._scrollForce();
		});

		// Destructor
		dt.on('destroy.scroller', function () {
			dom.w.off('resize.dt-scroller');
			that.dom.scroller.off('.dt-scroller');
			that.dom.table.off('.scroller');

			dom.s(that.s.dtApi.table().container()).classRemove('dts');

			that.dom.table.css({
				position: '',
				top: '',
				left: ''
			});
		});
	}

	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
	 * Private methods
	 */

	/**
	 * Automatic calculation of table row height. This is just a little tricky
	 * here as using initialisation DataTables has tale the table out of the
	 * document, so we need to create a new table and insert it into the
	 * document, calculate the row height and then whip the table out.
	 */
	private _calcRowHeight() {
		var dt = this.s.dt;
		var origTable = this.dom.table;
		var clonedTable = origTable.clone(false);
		var tbody = dom.c('tbody').appendTo(clonedTable);
		var dtClasses = dt.classes;
		var classes = {
			container: dtClasses.container,
			scroller: dtClasses.scrolling.container,
			body: dtClasses.scrolling.body
		};

		var container = dom
			.c('div')
			.classAdd(classes.container)
			.classAdd('DTS')
			.append(
				dom
					.c('div')
					.classAdd(classes.scroller)
					.append(dom.c('div').classAdd(classes.body))
			);

		// Want 3 rows in the sizing table so CSS styles don't come into play -
		// take the size of the middle row
		origTable
			.children('tbody > tr:nth-child(-n+3)')
			.clone()
			.appendTo(tbody);
		var rowsCount = tbody.find('tr').count();

		if (rowsCount === 1) {
			tbody.prepend(dom.c('tr').append(dom.c('td').html('&#160;')));
			tbody.prepend(dom.c('tr').append(dom.c('td').html('&#160;')));
		}
		else {
			for (; rowsCount < 3; rowsCount++) {
				tbody.prepend(dom.c('tr').append(dom.c('td').html('&#160;')));
			}
		}

		container.find('div.' + classes.body).append(clonedTable);

		var insertEl = origTable.parent();

		if (!insertEl.isVisible()) {
			insertEl = dom.s('body');
		}

		// Remove form element links as they might select over others
		// (particularly radio and checkboxes)
		container.find('input').removeAttr('name');

		container.appendTo(insertEl);
		this.s.heights.row = tbody.find('tr').eq(1).height('outer');

		container.remove();
	}

	/**
	 * Draw callback function which is fired when the DataTable is redrawn. The
	 * main function of this method is to position the drawn table correctly the
	 * scrolling container for the rows that is displays as a result of the
	 * scrolling position.
	 */
	private _draw() {
		var pageInfo = this.s.dtApi.page.info();
		var that = this,
			heights = this.s.heights,
			scrollTop = this.dom.scroller.scrollTop(),
			tableHeight = this.dom.table.height(),
			displayStart = pageInfo.start,
			displayLen = pageInfo.length,
			displayEnd = pageInfo.recordsDisplay,
			viewportEndY = scrollTop + heights.viewport;

		// Disable the scroll event listener while we are updating the DOM
		this.s.skip = true;

		// If paging is reset
		if (
			(this.s.dt.wasOrdered || this.s.dt.wasFiltered) &&
			displayStart === 0 &&
			!this.s.dt.drawHold
		) {
			this.s.topRowFloat = 0;
		}

		scrollTop =
			this.s.scrollType === 'jump'
				? this._domain(
						'virtualToPhysical',
						this.s.topRowFloat * heights.row
				  )
				: scrollTop;

		// Store positional information so positional calculations can be based
		// upon the current table draw position
		this.s.baseScrollTop = scrollTop;
		this.s.baseRowTop = this.s.topRowFloat;

		// Position the table in the virtual scroller
		var tableTop =
			scrollTop - (this.s.topRowFloat - displayStart) * heights.row;

		if (displayStart === 0) {
			tableTop = 0;
		}
		else if (displayStart + displayLen >= displayEnd) {
			tableTop = heights.scroll - tableHeight;
		}
		else {
			var tableBottomY = tableTop + tableHeight;

			if (tableBottomY < viewportEndY) {
				// The last row of the data is above the end of the viewport.
				// This means the background is visible, which is not what the user expects.
				var newTableTop = viewportEndY - tableHeight;
				var diffPx = newTableTop - tableTop;
				this.s.baseScrollTop += diffPx + 1; // Update start row number in footer.
				tableTop = newTableTop; // Move table so last line of data is at the bottom of the viewport.
			}
		}

		this.dom.table.css('top', tableTop + 'px');

		/* Cache some information for the scroller */
		this.s.tableTop = tableTop;
		this.s.tableBottom = tableHeight + this.s.tableTop;

		// Calculate the boundaries for where a redraw will be triggered by the
		// scroll event listener
		var boundaryPx = (scrollTop - this.s.tableTop) * this.c.boundaryScale;
		this.s.redrawTop = scrollTop - boundaryPx;
		this.s.redrawBottom =
			scrollTop + boundaryPx >
			heights.scroll - heights.viewport - heights.row
				? heights.scroll - heights.viewport - heights.row
				: scrollTop + boundaryPx;

		this.s.skip = false;

		if (that.s.ignoreScroll) {
			// Restore the scrolling position that was saved by DataTable's
			// state saving Note that this is done on the second draw when data
			// is Ajax sourced, and the first draw when DOM soured
			if (
				this.s.dt.features.stateSave &&
				this.s.dt.stateLoaded !== null &&
				typeof this.s.dt.stateLoaded.scroller != 'undefined'
			) {
				// A quirk of DataTables is that the draw callback will occur on
				// an empty set if Ajax sourced, but not if server-side
				// processing.
				var ajaxSourced =
					that.s.dt.ajax && !this.s.dt.features.serverSide
						? true
						: false;

				if (
					(ajaxSourced && this.s.dt.drawCount >= 2) ||
					(!ajaxSourced && this.s.dt.drawCount >= 1)
				) {
					setTimeout(function () {
						that.dom.scroller.scrollTop(
							that.s.dt.stateLoaded!.scroller!.scrollTop
						);

						// In order to prevent layout thrashing we need another
						// small delay
						setTimeout(function () {
							that.s.ignoreScroll = false;
						}, 0);
					}, 0);
				}
			}
			else {
				that.s.ignoreScroll = false;
			}
		}

		// Because of the order of the DT callbacks, the info update will
		// take precedence over the one we want here. So a 'thread' break is
		// needed.  Only add the thread break if bInfo is set
		if (this.s.dt.features.info) {
			setTimeout(function () {
				that._info.call(that);
			}, 0);
		}

		this.dom.table.trigger('position.dts.dt', false, [tableTop]);
	}

	/**
	 * Convert from one domain to another. The physical domain is the actual
	 * pixel count on the screen, while the virtual is if we had browsers which
	 * had scrolling containers of infinite height (i.e. the absolute value)
	 *
	 * @param dir Domain transform direction, `virtualToPhysical` or
	 *   `physicalToVirtual`
	 * @returns Calculated transform
	 */
	private _domain(
		dir: 'virtualToPhysical' | 'physicalToVirtual',
		val: number
	) {
		var heights = this.s.heights;
		var diff;
		var magic = 10000; // point at which the non-linear calculations start

		// If the virtual and physical height match, then we use a linear
		// transform between the two, allowing the scrollbar to be linear
		if (heights.virtual === heights.scroll) {
			return val;
		}

		// In the first 10k pixels and the last 10k pixels, we want the
		// scrolling to be linear. After that it can be non-linear. It would be
		// unusual for anyone to mouse wheel through that much.
		if (val < magic) {
			return val;
		}
		else if (
			dir === 'virtualToPhysical' &&
			val >= heights.virtual - magic
		) {
			diff = heights.virtual - val;
			return heights.scroll - diff;
		}
		else if (dir === 'physicalToVirtual' && val >= heights.scroll - magic) {
			diff = heights.scroll - val;
			return heights.virtual - diff;
		}

		// Otherwise, we want a non-linear scrollbar to take account of the
		// redrawing regions at the start and end of the table, otherwise these
		// can stutter badly - on large tables 30px (for example) scroll might
		// be hundreds of rows, so the table would be redrawing every few px at
		// the start and end. Use a simple linear eq. to stop this, effectively
		// causing a kink in the scrolling ratio. It does mean the scrollbar is
		// non-linear, but with such massive data sets, the scrollbar is going
		// to be a best guess anyway
		var m =
			(heights.virtual - magic - magic) /
			(heights.scroll - magic - magic);
		var c = magic - m * magic;

		return dir === 'virtualToPhysical' ? (val - c) / m : m * val + c;
	}

	/**
	 * Update any information elements that are controlled by the DataTable
	 * based on the scrolling viewport and what rows are visible in it. This
	 * function basically acts in the same way as in DataTables, and effectively
	 * replaces that function.
	 */
	private _info() {
		var dt = this.s.dt,
			dtApi = this.s.dtApi,
			language = dt.language,
			info = dtApi.page.info(),
			total = info.recordsDisplay,
			max = info.recordsTotal;

		// If the scroll type is `cont` (continuous) we need to use
		// `baseRowTop`, which also means we need to work out the difference
		// between the current scroll position and the "base" for when it was
		// required
		var diffRows =
			(this.s.lastScrollTop - this.s.baseScrollTop) / this.s.heights.row;
		var start = Math.floor(this.s.baseRowTop + diffRows) + 1;

		// For a jump scroll type, we just use the straightforward calculation
		// based on `topRowFloat`
		if (this.s.scrollType === 'jump') {
			start = Math.floor(this.s.topRowFloat) + 1;
		}

		var possibleEnd =
				start +
				Math.floor(this.s.heights.viewport / this.s.heights.row),
			end = possibleEnd > total ? total : possibleEnd,
			result: string;

		if (total === 0 && total == max) {
			/* Empty record set */
			result = language.infoEmpty + language.infoPostFix;
		}
		else if (total === 0) {
			// Empty record set after filtering
			result =
				language.infoEmpty +
				' ' +
				language.infoFiltered +
				language.infoPostFix;
		}
		else if (total == max) {
			// Normal record set
			result = language.info + language.infoPostFix;
		}
		else {
			// Record set after filtering
			result =
				language.info +
				' ' +
				language.infoFiltered +
				language.infoPostFix;
		}

		result = this._macros(result, start, end, max, total);

		var callback = language.infoCallback;

		if (callback) {
			result = callback.call(
				dt.instance,
				dt,
				start,
				end,
				max,
				total,
				result
			);
		}

		// Update the info elements
		dom.s(dtApi.table().container())
			.find('div.dt-info')
			.each(function (el) {
				dom.s(el).html(result);

				dtApi.trigger('info', [dtApi.settings()[0], el, result]);
			});
	}

	/**
	 * String replacement for info display. Basically the same as what
	 * DataTables does.
	 *
	 * @param str
	 * @param start
	 * @param end
	 * @param max
	 * @param total
	 * @returns Formatted string
	 */
	private _macros(
		str: string,
		start: number,
		end: number,
		max: number,
		total: number
	) {
		var api = this.s.dtApi;
		var settings = this.s.dt;
		var formatter = settings.formatNumber;

		return str
			.replace(/_START_/g, formatter.call(settings, start, settings))
			.replace(/_END_/g, formatter.call(settings, end, settings))
			.replace(/_MAX_/g, formatter.call(settings, max, settings))
			.replace(/_TOTAL_/g, formatter.call(settings, total, settings))
			.replace(/_ENTRIES_/g, api.i18n('entries', ''))
			.replace(/_ENTRIES-MAX_/g, api.i18n('entries', '', max))
			.replace(/_ENTRIES-TOTAL_/g, api.i18n('entries', '', total));
	}

	/**
	 * Parse CSS height property string as number
	 *
	 * An attempt is made to parse the string as a number. Currently supported
	 * units are 'px', 'vh', and 'rem'. 'em' is partially supported; it works as
	 * long as the parent element's font size matches the body element. Zero is
	 * returned for unrecognized strings.
	 *
	 * @param cssHeight CSS height property string
	 * @returns Height
	 */
	private _parseHeight(cssHeight: string | number) {
		if (typeof cssHeight === 'number') {
			return cssHeight;
		}

		var height;
		var matches = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(px|em|rem|vh)$/.exec(
			cssHeight
		);

		if (matches === null) {
			return 0;
		}

		var value = parseFloat(matches[1]);
		var unit = matches[2];

		if (unit === 'px') {
			height = value;
		}
		else if (unit === 'vh') {
			height = (value / 100) * dom.w.height();
		}
		else if (unit === 'rem') {
			height = value * parseFloat(dom.s(':root').css('font-size'));
		}
		else if (unit === 'em') {
			height = value * parseFloat(dom.s('body').css('font-size'));
		}

		return height ? height : 0;
	}

	/**
	 * Scrolling function - fired whenever the scrolling position is changed.
	 * This method needs to use the stored values to see if the table should be
	 * redrawn as we are moving towards the end of the information that is
	 * currently drawn or not. If needed, then it will redraw the table based on
	 * the new position.
	 */
	private _scroll() {
		var that = this,
			heights = this.s.heights,
			scrollTop = this.dom.scroller.scrollTop(),
			pageInfo = this.s.dtApi.page.info(),
			topRow;

		if (this.s.skip) {
			return;
		}

		if (this.s.ignoreScroll) {
			return;
		}

		if (scrollTop === this.s.lastScrollTop) {
			return;
		}

		/* If the table has been sorted or filtered, then we use the redraw that
		 * DataTables as done, rather than performing our own
		 */
		if (this.s.dt.wasFiltered || this.s.dt.wasOrdered) {
			this.s.lastScrollTop = 0;
			return;
		}

		/* We don't want to state save on every scroll event - that's heavy
		 * handed, so use a timeout to update the state saving only when the
		 * scrolling has finished
		 */
		if (this.s.stateTO) {
			clearTimeout(this.s.stateTO);
		}

		this.s.stateTO = setTimeout(function () {
			that.s.dtApi.state.save();

			// We can also use this to ensure that the `info` element is correct
			// since there can be a little scroll after the last scroll event!
			that._info();
		}, 250);

		this.s.scrollType =
			Math.abs(scrollTop - this.s.lastScrollTop) > heights.viewport
				? 'jump'
				: 'cont';

		this.s.topRowFloat =
			this.s.scrollType === 'cont'
				? this.pixelsToRow(scrollTop, false, false)
				: this._domain('physicalToVirtual', scrollTop) / heights.row;

		if (this.s.topRowFloat < 0) {
			this.s.topRowFloat = 0;
		}

		/* Check if the scroll point is outside the trigger boundary which would
		 * required a DataTables redraw
		 */
		if (
			this.s.forceReposition ||
			scrollTop < this.s.redrawTop ||
			scrollTop > this.s.redrawBottom
		) {
			var preRows = Math.ceil(
				((this.c.displayBuffer - 1) / 2) * this.s.viewportRows
			);

			topRow = Math.floor(this.s.topRowFloat) - preRows;
			this.s.forceReposition = false;

			if (topRow <= 0) {
				/* At the start of the table */
				topRow = 0;
			}
			else if (
				topRow + pageInfo.length >
				pageInfo.recordsDisplay
			) {
				/* At the end of the table */
				topRow =
					pageInfo.recordsDisplay - pageInfo.length;
				if (topRow < 0) {
					topRow = 0;
				}
			}
			else if (topRow % 2 !== 0) {
				// For the row-striping classes (odd/even) we want only to start
				// on evens otherwise the stripes will change between draws and
				// look rubbish
				topRow++;
			}

			// Store calcuated value, in case the following condition is not
			// met, but so that the draw function will still use it.
			this.s.targetTop = topRow;

			if (topRow != pageInfo.start) {
				/* Cache the new table position for quick lookups */
				this.s.tableTop = this.dom.table.offset().top;
				this.s.tableBottom =
					this.dom.table.height() + this.s.tableTop;

				var draw = function () {
					that.s.dt.displayStart = that.s.targetTop;
					that.s.dtApi.draw('page');
				};

				/* Do the DataTables redraw based on the calculated start point
				 * - note that when using server-side processing we introduce a
				 * small delay to not DoS the server...
				 */
				if (this.s.dt.features.serverSide) {
					this.s.forceReposition = true;

					// This is used only for KeyTable and is not currently
					// publicly documented. Open question - is it useful for
					// anything else?
					this.dom.table.trigger('scroller-will-draw.dt');

					that.s.dtApi.processing(true);

					if (this.s.drawTO) {
						clearTimeout(this.s.drawTO);
					}

					this.s.drawTO = setTimeout(draw, this.c.serverWait);
				}
				else {
					draw();
				}
			}
		}
		else {
			this.s.topRowFloat = this.pixelsToRow(scrollTop, false, true);
		}

		// Update the table's information display for what is now in the
		// viewport
		this._info();

		this.s.lastScrollTop = scrollTop;
		this.s.stateSaveThrottle();

		if (this.s.scrollType === 'jump' && this.s.mousedown) {
			this.s.labelVisible = true;
		}
		if (this.s.labelVisible) {
			var labelFactor =
				(heights.viewport - heights.labelHeight - heights.xbar) /
				heights.scroll;

			this.dom.label
				.html(
					this.s.dt.formatNumber(
						Math.floor(this.s.topRowFloat) + 1,
						this.s.dt
					)
				)
				.css('top', (scrollTop + scrollTop * labelFactor) + 'px')
				.css('display', 'block');
		}
	}

	/**
	 * Force the scrolling container to have height beyond that of just the
	 * table that has been drawn so the user can scroll the whole data set.
	 *
	 * Note that if the calculated required scrolling height exceeds a maximum
	 * value (1 million pixels - hard-coded) the forcing element will be set
	 * only to that maximum value and virtual / physical domain transforms will
	 * be used to allow Scroller to display tables of any number of records.
	 */
	private _scrollForce() {
		var heights = this.s.heights;
		var max = 1000000;

		heights.virtual = heights.row * this.s.dtApi.page.info().recordsDisplay;
		heights.scroll = heights.virtual;

		if (heights.scroll > max) {
			heights.scroll = max;
		}

		// Minimum height so there is always a row visible (the 'no rows found'
		// if reduced to zero filtering)
		this.dom.force.css('height',
			heights.scroll > this.s.heights.row
				? heights.scroll + 'px'
				: this.s.heights.row + 'px'
		);
	}
}
