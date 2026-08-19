import DataTables, { Api, Context, Dom } from 'datatables.net';
import Scroller from './Scroller';

export default DataTables;

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * DataTables' types integration
 */
declare module 'datatables.net' {
	interface Options {
		/**
		 * Scroller extension options
		 */
		scroller?: boolean | Config;
	}

	interface Api<T> {
		/**
		 * Scroller methods container
		 *
		 * @returns Api for chaining with the additional Scroller methods
		 */
		scroller: ApiScrollerMethods<T>;
	}

	interface Context {
		scroller: Scroller;
	}

	interface ApiRowMethods<T> {
		/**
		 * Scroll to a row
		 */
		scrollTo(animate?: boolean): Api<T>;
	}

	interface DataTablesStatic {
		/**
		 * Scroller class
		 */
		Scroller: typeof Scroller;
	}

	interface StateLoad {
		scroller?: {
			topRow: number;
			baseRowTop: number;
			scrollTop: number;
		}
	}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Options
 */

export interface Defaults {
	/**
	 * Scroller uses the boundary scaling factor to decide when to redraw the
	 * table - which it typically does before you reach the end of the currently
	 * loaded data set (in order to allow the data to look continuous to a user
	 * scrolling through the data).
	 */
	boundaryScale: number;

	/**
	 * The display buffer is what Scroller uses to calculate how many rows it
	 * should pre-fetch for scrolling.
	 */
	displayBuffer: number;

	/**
	 * Scroller will attempt to automatically calculate the height of rows for
	 * it's internal calculations. However the height that is used can be
	 * overridden using this parameter.
	 */
	rowHeight: number | string;

	/**
	 * When using server-side processing, Scroller will wait a small amount of
	 * time to allow the scrolling to finish before requesting more data from
	 * the server.
	 */
	serverWait: number;
}

export interface Config extends Partial<Defaults> {}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * API
 */

interface ApiScrollerMethods<T> {
	/**
	 * Calculate and store information about how many rows are to be displayed
	 * in the scrolling viewport, based on current dimensions in the browser's
	 * rendering.
	 *
	 * @param redraw Flag to indicate if the table should immediately redraw or
	 *   not. true will redraw the table, false will not.
	 * @returns DataTables Api instance for chaining
	 */
	measure(redraw?: boolean): Api<T>;

	/**
	 * Get information about current displayed record range.
	 *
	 * @returnsAn object with the parameters start and end, defining the start
	 *   and end, 0 based, display indexes of the rows that are visible in the
	 *   table's scrolling viewport.
	 */
	page(): PageInfo;

	/**
	 * Move the display to show the row at the index given.
	 *
	 * @param index Display index to jump to.
	 * @param animate Animate the scroll (true) or not (false).
	 */
	toPosition(index: number, animate?: boolean): Api<T>;
}

interface PageInfo {
	/**
	 * The 0-indexed record at the top of the viewport
	 */
	start: number;

	/**
	 * The 0-indexed record at the bottom of the viewport
	 */
	end: number;
}

export interface Settings {
	/**
	 * Indicate if the scroll should animate or not
	 */
	ani: boolean;

	/**
	 * DataTables settings object
	 */
	dt: Context;

	/**
	 * DataTables API instance
	 */
	dtApi: Api;

	/**
	 * Pixel location of the top of the drawn table in the viewport
	 */
	tableTop: number;

	/**
	 * Pixel location of the bottom of the drawn table in the viewport
	 */
	tableBottom: number;

	/**
	 * Pixel location of the boundary for when the next data set should be
	 * loaded and drawn when scrolling up the way.
	 */
	redrawTop: number;

	/**
	 * Pixel location of the boundary for when the next data set should be
	 * loaded and drawn when scrolling down the way. Note that this is actually
	 * calculated as the offset from the top.
	 */
	redrawBottom: number;

	/**
	 * Auto row height or not indicator
	 */
	autoHeight: boolean;

	/**
	 * Number of rows calculated as visible in the visible viewport
	 */
	viewportRows: number;

	/**
	 * setTimeout reference for state saving, used when state saving is enabled
	 * in the DataTable and when the user scrolls the viewport in order to stop
	 * the cookie set taking too much CPU!
	 */
	stateTO: null | ReturnType<typeof setTimeout>;

	stateSaveThrottle: Function;

	/**
	 * setTimeout reference for the redraw, used when server-side processing is
	 * enabled in the DataTables in order to prevent DoSing the server
	 */
	drawTO: null | ReturnType<typeof setTimeout>;

	heights: {
		jump: number;
		page: number;
		virtual: number;
		scroll: number;
		row: number;
		viewport: number;
		labelHeight: number;
		xbar: number;
	};

	topRowFloat: number;
	scrollDrawDiff: null;
	labelVisible: boolean;
	forceReposition: boolean;
	baseRowTop: number;
	baseScrollTop: number;
	mousedown: boolean;
	lastScrollTop: number;
	ignoreScroll: boolean;
	scrollType: 'jump' | 'cont';
	skip: boolean;
	targetTop: number;
}

export interface DomInternal {
	force: Dom;
	label: Dom;
	scroller: Dom;
	table: Dom;
}
