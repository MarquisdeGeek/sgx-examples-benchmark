
/**
 * @constructor
 */
BenchmarkSettings = function() {
	this.m_iCount = 10;
	this.m_iMaxSize = 50;
	this.m_bRandomizeTextures = TRUE;
	this.m_bRandomizeRegions = TRUE;
	this.m_bRotate = FALSE;
	this.m_bVertexColouring = FALSE;
}

/**
 * @constructor
 */
BenchmarkState = function() {
	this.fps = 0;
	this.m_bStarted = FALSE;
	this.m_bPaused = FALSE;
	this.m_iFrameCount = 0;
	this.m_iFrameTime = 0;
	
	this.m_fRotationAngleList = new Array();
	for(var i=0;i<32;++i) {
		this.m_fRotationAngleList.push(sgxRand(SGX_2PI));
	}

	this.m_TextureList = new Array();
	for(var i=0;i<2;++i) {
		this.m_TextureList.push(sgx.graphics.TextureManager.get().load("bmt/image"+i));
	}
	
	this.m_pDesign = sgxutils.gui.DesignManager.load("bmt/benchmark");
}

BenchmarkState.prototype.newFrameUpdate = function(duration) {
	// we don't inc the frame count, since that'll be done by the draw
	this.m_iFrameTime += duration;
}

BenchmarkState.prototype.newFrame = function(duration) {
	++this.m_iFrameCount;
	this.m_iFrameTime += duration;
	
	if ((this.m_iFrameCount % 10) == 0  || this.m_iFrameTime > 1) {
		this.fps = sgxStringFormat(status, "%.1f", (this.m_iFrameCount/this.m_iFrameTime));
		this.m_iFrameCount = 0;
		this.m_iFrameTime = 0;
		this.refreshUI();
	}
}

BenchmarkState.prototype.update = function(telaps) {
	if (!this.m_bPaused) {
		for(var i=0;i<32;++i) {
			this.m_fRotationAngleList[i] += telaps;
			if (this.m_fRotationAngleList[i] >= SGX_2PI) {
				this.m_fRotationAngleList[i] -= SGX_2PI;
			}
		}
	}
}

BenchmarkState.prototype.onGUIWidgetSelect= function(widget, position) {
	var uid = widget.getUserData();
	var state = !widget.getCheckedState() ? TRUE : FALSE;
	
	switch(uid) {
		case	3:
					g_Settings.m_bRandomizeTextures = state;
					g_Settings.m_bRandomizeRegions = state;
					break;
		case	4:
					g_Settings.m_bRotate = state;
					break;
		case	5:
					g_Settings.m_bVertexColouring = state;
					break;
	}
	return TRUE;
}

BenchmarkState.prototype.onGUIWidgetCursorDragged = function(widget, position) {
	if (widget.asSliderBar()) {
		var uid = widget.getUserData();
		var pos = new sgx.Point2f();
		var track = widget.getTrackPositionHorizontal(pos);
		
		switch(uid) {
			case 1:
					g_Settings.m_iCount = sgxFloor(track);
					break;
			case 2:
					g_Settings.m_iMaxSize = sgxFloor(track);
					break;
		}
		this.refreshUI();
	}
	return TRUE;
}

BenchmarkState.prototype.refreshUI = function() {
	widget = g_State.m_pInterface.getWidgetOfUserData(10);
	widget.setText(g_Settings.m_iCount);
	
	widget = g_State.m_pInterface.getWidgetOfUserData(11);
	widget.setText(g_Settings.m_iMaxSize);
	
	widget = g_State.m_pInterface.getWidgetOfUserData(6);
	widget.setText(g_State.fps);
	
	g_State.m_pInterface.getWidgetOfUserData(3).asCheckBox().setCheckedState(g_Settings.m_bRandomizeTextures);
	g_State.m_pInterface.getWidgetOfUserData(4).asCheckBox().setCheckedState(g_Settings.m_bRotate);
	g_State.m_pInterface.getWidgetOfUserData(5).asCheckBox().setCheckedState(g_Settings.m_bVertexColouring);
		
}


var g_Settings;
var g_State;


function bmtInit() {
	g_Settings = new BenchmarkSettings();
	g_State = new BenchmarkState();
	
	// load GUI
	var stdFont = sgx.graphics.FontManager.get().registerFont("std", null, new sgx.graphics.FontParameters(sgx.graphics.FontParameters.eFontTypeNatural, 10, "Arial"));
	sgx.gui.Engine.get().setDefaultFont(stdFont);
}

function bmtDraw() {
	var pSurface = sgx.graphics.DrawSurfaceManager.get().getDisplaySurface();
	var surfaceWidth = pSurface.getWidth();
	var surfaceHeight = pSurface.getHeight();
	var color = new sgx.ColorRGBA();
	var mtx = new sgx.Matrix43f();
	
	pSurface.setFillTexture(g_State.m_TextureList[0]);
	
	for(var i=0;i<g_Settings.m_iCount;++i) {
		var x = sgxRand(surfaceWidth);
		var y = sgxRand(surfaceHeight);
		var width = sgxRand(10, g_Settings.m_iMaxSize);
		var height = sgxRand(10, g_Settings.m_iMaxSize);

		// If this slows down, then try batching your textures in blocks.
		if (g_Settings.m_bRandomizeTextures) {
			pSurface.setFillTexture(g_State.m_TextureList[sgxRand(g_State.m_TextureList.length)]);
		}
		
		// This should never cause a slow-down on its own. (Possibly with random texture.)
		// If it does, your browser is falling back to pre-HTML5 methods of rendering.
		if (g_Settings.m_bRandomizeRegions) {
			var pTexture = pSurface.getFillTexture();
			pSurface.setFillTextureRegion(sgxRand(pTexture.getRegionCount()));
		}
		
		// If this is slow, set the transform once for as many objects as possible.
		if (g_Settings.m_bRotate) {
			mtx.setRotateZ(g_State.m_fRotationAngleList[i&31]);
			mtx.pos.x = x;
			mtx.pos.y = y;
			x = y = 0;
			pSurface.setRenderTransform(mtx);
		}
		
		// If this is slow, pre-bake the colours into your textures
		if (g_Settings.m_bVertexColouring) {
			color.r = sgxRand();
			color.g = sgxRand();
			color.b = sgxRand();
			color.a = sgxRand();
			pSurface.setFillColor(color);
		}
		
		pSurface.fillRect(x, y, x+width, y+height);
	}
	
	pSurface.setRenderTransform(NULL);
}



function SGXPrepare_OS() {
	sgx.filesystem.Engine.get().mountDirectory("sgx", "http://sgxengine.com/assets/sgx");

	sgxskeleton.PrepareLoadingPage();

	new sgx.main.System();

	sgx.graphics.Engine.create(640,428);	// the size of the draw area we (as programmers) will use

	sgx.main.System.writePage();
	sgx.main.System.initialize();	// optionally pass the 'loading_screen' ID here, to hide the contents once loaded
}


function SGXinit() {
	bmtInit();
}

function SGXstart() {
	g_State.m_bStarted = TRUE;
}

function SGXupdate(telaps) {
	var startAt = sgx.time.Clock.getTickCount();
	var widget;

	if (sgx.input.Engine.get().mouseLeft.wasPressed() && sgx.input.Engine.get().getMouseY()>50) {
		g_State.m_bPaused = !g_State.m_bPaused;
	}

	if (!g_State.m_pInterface && g_State.m_pDesign.isLoaded()) {
		//var pui = new PUI();
		g_State.m_pInterface = g_State.m_pDesign.getScreen(1).applyScreen();
		g_State.m_pInterface.setHandler(g_State, TRUE);
		
		widget = g_State.m_pInterface.getWidgetOfUserData(1).asSliderBar();
		widget.m_SetupParams.m_fRangeXmin = 10;
		widget.m_SetupParams.m_fRangeXmax = 1000;
		widget.setTrackPositionHorizontal(g_Settings.m_iCount);		
		
		widget = g_State.m_pInterface.getWidgetOfUserData(2).asSliderBar();
		widget.m_SetupParams.m_fRangeXmin = 1;
		widget.m_SetupParams.m_fRangeXmax = 200;
		widget.setTrackPositionHorizontal(g_Settings.m_iMaxSize);
		
		g_State.refreshUI();
		
		sgx.gui.Engine.get().setRootWidget(g_State.m_pInterface);
	}
	//
	g_State.update(telaps);

	g_State.newFrameUpdate(sgx.time.Clock.getTickCount() - startAt);
}

function SGXdraw() {

	if (g_State.m_bStarted) {
		var startAt = sgx.time.Clock.getTickCount();
		//		
		if (!g_State.m_bPaused) {
			g_State.m_pDesign.getScreen(0).applyScreen().draw();
			bmtDraw();		
		}
		//
		var pSurface = sgx.graphics.DrawSurfaceManager.get().getDisplaySurface();
		pSurface.setFillColor(sgxColorRGBA.White);
		sgx.gui.Engine.get().draw();
		//
		g_State.newFrame(sgx.time.Clock.getTickCount() - startAt);
	}
}
