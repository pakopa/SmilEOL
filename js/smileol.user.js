// ==UserScript== 
// @name          SmilEOL
// @version       0.4.3.4
// @namespace     http://www.elotrolado.net
// @description   A\u00F1ade tus propios iconos a EOL
// @run-at        document-end
// @include       http://www.elotrolado.net/* 
// @exclude              
// ==/UserScript== 

/* Initialization */

// Variable para el prefijo de la clave de almacenamiento, 
// cambiar\u00E1 en la versi\u00F3n final y ha de ser modificable.
var storageKey = "SmilEOL.userdata";

// Variable que almacena los grupos y los datos de las im\u00E1genes en todo
// momento
// Las modificaciones se har\u00E1n sobre esta variable y luego se invocar\u00E1
// la funci\u00F3n saveData() para guardar el estado.
var _groups = new Array();

// variables \u00FAtiles de acceso a los elementos principales
var smileylist = document.getElementById("smiley-list");
var smileybox = document.getElementById("smiley-box");
var smileymgmt = document.getElementById("smiley-mgmt");

// mapeo que se usar\u00E1 en la interpretaci\u00F3n.
var smileyMapping = new Array();
/* Initialization */

// Tipo que representa un enlace r\u00E1pido
function LinkObject(name, url) {

	this.name = name;
	this.url = url;

	LinkObject.prototype.serialize = function() {

		return "L:" + this.name + "\u00A7" + this.url + "\u00A7\u00A7";
	};

	LinkObject.prototype.getElement = function() {

		var functionCode = "insert_text('" + this.url + "', true)";
		return this.getElementWFunction(functionCode);
	};

	LinkObject.prototype.getElementWFunction = function(functionCode) {

		var span = document.createElement("span");
		var a = document.createElement("a");
		a.href = "javascript:void(0)";
		a.title = this.name;
		a.setAttribute("onclick", functionCode);
		a.appendChild(document.createTextNode("#" + this.name));
		span.appendChild(document.createTextNode("  "));
		span.appendChild(a);
		span.appendChild(document.createTextNode("  "));
		return span;
	};
}

// interpreta una cadena como un objeto LinkObject
LinkObject.deserialize = function(arg) {

	var rgx = /L:([^\u00A7]+?)\u00A7([^\u00A7]*?)\u00A7\u00A7/;

	result = arg.match(rgx);

	if (result != null) {
		return new LinkObject(result[1], result[2]);
	} else {
		throw arg + " is unparseable";
	}
};

// Tipo que representa una imagen o enlace r\u00E1pido con imagen
function ImageObject(title, url, insert, keyword) {

	// clave
	this.title = title;
	// url de la imagen que se muestra
	this.url = url;
	// texto que se inserta al pinchar en la imagen
	this.insert = insert;

	if (this.insert == null) {
		this.insert = "[img]" + url + "[/img]";
	}

	this.keyword = keyword;

	if (this.keyword == null) {
		this.keyword = ".";
	}

	ImageObject.prototype.serialize = function() {

		return "I:" + this.title + "\u00A7" + this.url + "\u00A7" + this.insert
				+ "\u00A7" + this.keyword + "\u00A7\u00A7";
	};

	ImageObject.prototype.getElement = function() {

		var functionCode = "insert_text('" + this.insert + "', true)";
		return this.getElementWFunction(functionCode);
	};

	ImageObject.prototype.getElementWFunction = function(functionCode) {

		var span = document.createElement("span");
		var a = document.createElement("a");

		a.setAttribute("href", "javascript:void(0)");
		a.setAttribute("onclick", functionCode);
		var img = new Image();
		img.src = this.url;
		img.alt = this.title;
		img.title = this.title;

		adjustSize(img);

		a.appendChild(img);
		span.appendChild(a);

		return span;
	};
}

// interpreta una cadena como un objeto ImageObject
ImageObject.deserialize = function(arg) {

	var rgx = /I:([^\u00A7]+?)\u00A7([^\u00A7]*?)\u00A7([^\u00A7]*?)\u00A7([^\u00A7]*?)\u00A7\u00A7/;

	result = arg.match(rgx);

	if (result != null) {
		return new ImageObject(result[1], result[2], result[3], result[4]);
	} else {
		throw arg + " is unprseable";
	}
};

// interpreta una cadena como un objeto ImageObject o LinkObject
function deserialize(arg) {

	var rgxImg = /I:([^\u00A7]+?)\u00A7([^\u00A7]*?)\u00A7([^\u00A7]*?)\u00A7([^\u00A7]*?)\u00A7\u00A7/;
	var rgxLnk = /L:([^\u00A7]+?)\u00A7([^\u00A7]*?)\u00A7\u00A7/;

	if (rgxImg.test(arg)) {
		return ImageObject.deserialize(arg);
	} else if (rgxLnk.test(arg)) {
		return LinkObject.deserialize(arg);
	} else {
		return null;
	}

};

// reescala la imagen para el cuadro de selecci\u00F3n
function adjustSize(img) {

	if (!img.complete) {
		setTimeout(function() {

			adjustSize(img);
		}, 250);
	} else {

		var prop = img.width / img.height;
		var h = 25;
		var w = 180;
		if (img.height > h) {
			img.height = h;
			img.width = h * prop;
		}

		if (img.width > w) {
			img.width = w;
			img.heigth = w / prop;
		}

	}
}

// Tipo que representa un grupo de im\u00E1genes y/o enlaces r\u00E1pidos
function Group(key, elements) {

	this.name = key;
	this.elements = elements;
	if (elements == null) {
		this.elements = new Array();
	}

}

// m\u00E9todo que devuelve una cadena equivalente a la lista de elementos
Group.prototype.serializeElements = function() {

	elementList = "";
	for ( var i = 0; i < this.elements.length; i++) {
		elementList += this.elements[i].serialize();
	}

	return elementList;
};

// m\u00E9todo que devuelve el c\u00F3digo de exportaci\u00F3n
Group.prototype.serializeGroup = function() {

	return this.name + "\u00A7\u00A7\u00A7" + this.serializeElements();
};

// m\u00E9todo que interpreta una cadena como lista de elementos
var deserializeList = function(elementList) {

	var rgx = /I:([^\u00A7]+?)\u00A7([^\u00A7]*?)\u00A7([^\u00A7]*?)\u00A7([^\u00A7]*?)\u00A7\u00A7|L:([^\u00A7]+?)\u00A7([^\u00A7]*?)\u00A7\u00A7/g;

	var elementList = elementList.match(rgx);

	var elements = new Array();

	for ( var j = 0; j < elementList.length; j++) {
		var str = elementList[j];
		elements.push(deserialize(str));
	}

	return elements;
};

// m\u00E9todo que interpreta una cadena como un Objeto group
Group.deserializePack = function(iconpackStr) {

	var rgx = /[^\u00A7]*?\u00A7\u00A7\u00A7((I:([^\u00A7]+?)\u00A7([^\u00A7]*?)\u00A7([^\u00A7]*?)\u00A7([^\u00A7]*?)\u00A7\u00A7|L:([^\u00A7]+?)\u00A7([^\u00A7]*?)\u00A7\u00A7)*)$/;

	if (!rgx.test(iconpackStr)) {
		throw "Unparseable iconpack";
	} else {
		var packData = iconpackStr.split("\u00A7\u00A7\u00A7");
		return new Group(packData[0], deserializeList(packData[1]));
	}
};

// Guarda el la variable _groups en el almacenamiento local.
var saveData = function() {

	var groupList = "";

	for ( var groupKey in _groups) {
		groupList += groupKey + "\u00A7";

		var group = _groups[groupKey];

		var elementList = group.serializeElements();

		localStorage.setItem(storageKey + "." + groupKey, elementList);
	}

	localStorage.setItem(storageKey + "._groups", groupList);
};

// Recupera la variable _groups del almacenamiento local.
var loadData = function() {

	var groups = localStorage.getItem(storageKey + "._groups");
	if (groups == null) {
		return null;
	}

	var output = new Array();
	var groups = groups.split("\u00A7");

	for ( var i = 0; i < groups.length - 1; i++) {
		var g = groups[i];

		var elementList = localStorage.getItem(storageKey + "." + g);

		var elements = deserializeList(elementList);

		output[g] = new Group(g, elements);
	}

	return output;
};

var resetData = function() {

	var groups = localStorage.getItem(storageKey + "._groups");
	if (groups == null) {
		return;
	}

	var output = new Array();
	var groups = groups.split("\u00A7");

	for ( var i = 0; i < groups.length - 1; i++) {
		var g = groups[i];
		localStorage.removeItem(storageKey + "." + g);
	}

	localStorage.removeItem(storageKey + "._groups");

};

// inicializa el script
function init() {

	try {
		_groups = loadData();
		if (_groups == null) {
			_groups = StaticData.loadAll();
			saveData();
		}
	} catch (e) {
		_groups = StaticData.loadAll();
		alert(e);
	}
};

// Objecto para cargar las im\u00E1genes por defecto.
var StaticData = {};

StaticData.loadAll = function() {
	var groups = new Array();
	groups['SmilEOL'] = StaticData.loadSmilEOL();
	groups['instantsfun.es'] = StaticData.loadInstants();
	groups['EOL'] = StaticData.loadDefaultEOL();
	return groups;
};

StaticData.loadInstants = function() {

	var str = "instantsfun.es\u00A7\u00A7\u00A7"
			+ "L:badumtss\u00A7http://instantsfun.es/badumtss\u00A7\u00A7"
			+ "L:ballsofsteel\u00A7http://instantsfun.es/ballsofsteel\u00A7\u00A7"
			+ "L:barrelroll\u00A7http://instantsfun.es/barrelroll\u00A7\u00A7"
			+ "L:bazinga\u00A7http://instantsfun.es/bazinga\u00A7\u00A7"
			+ "L:bennyhill\u00A7http://instantsfun.es/bennyhill\u00A7\u00A7"
			+ "L:birdtheword\u00A7http://instantsfun.es/birdtheword\u00A7\u00A7"
			+ "L:boomheadshot\u00A7http://instantsfun.es/boomheadshot\u00A7\u00A7"
			+ "L:burned\u00A7http://instantsfun.es/burned\u00A7\u00A7"
			+ "L:chan\u00A7http://instantsfun.es/chan\u00A7\u00A7"
			+ "L:chanchan\u00A7http://instantsfun.es/chanchan\u00A7\u00A7"
			+ "L:chewbacca\u00A7http://instantsfun.es/chewbacca\u00A7\u00A7"
			+ "L:combobreaker\u00A7http://instantsfun.es/combobreaker\u00A7\u00A7"
			+ "L:correct\u00A7http://instantsfun.es/correct\u00A7\u00A7"
			+ "L:crickets\u00A7http://instantsfun.es/crickets\u00A7\u00A7"
			+ "L:csi\u00A7http://instantsfun.es/csi\u00A7\u00A7"
			+ "L:cuek\u00A7http://instantsfun.es/cuek\u00A7\u00A7"
			+ "L:doh\u00A7http://instantsfun.es/doh\u00A7\u00A7"
			+ "L:drama\u00A7http://instantsfun.es/drama\u00A7\u00A7"
			+ "L:dramatic\u00A7http://instantsfun.es/dramatic\u00A7\u00A7"
			+ "L:drumroll\u00A7http://instantsfun.es/drumroll\u00A7\u00A7"
			+ "L:emergencyodel\u00A7http://instantsfun.es/emergencyodel\u00A7\u00A7"
			+ "L:epic\u00A7http://instantsfun.es/epic\u00A7\u00A7"
			+ "L:evillaugh\u00A7http://instantsfun.es/evillaugh\u00A7\u00A7"
			+ "L:excellent\u00A7http://instantsfun.es/excellent\u00A7\u00A7"
			+ "L:falconpunch\u00A7http://instantsfun.es/falconpunch\u00A7\u00A7"
			+ "L:fatality\u00A7http://instantsfun.es/fatality\u00A7\u00A7"
			+ "L:finishhim\u00A7http://instantsfun.es/finishhim\u00A7\u00A7"
			+ "L:fuckoff\u00A7http://instantsfun.es/fuckoff\u00A7\u00A7"
			+ "L:gong\u00A7http://instantsfun.es/gong\u00A7\u00A7"
			+ "L:haha\u00A7http://instantsfun.es/haha\u00A7\u00A7"
			+ "L:hallelujahlong\u00A7http://instantsfun.es/hallelujahlong\u00A7\u00A7"
			+ "L:hallelujahshort\u00A7http://instantsfun.es/hallelujahshort\u00A7\u00A7"
			+ "L:incorrect\u00A7http://instantsfun.es/incorrect\u00A7\u00A7"
			+ "L:inetporn\u00A7http://instantsfun.es/inetporn\u00A7\u00A7"
			+ "L:itsatrap\u00A7http://instantsfun.es/itsatrap\u00A7\u00A7"
			+ "L:kamehameha\u00A7http://instantsfun.es/kamehameha\u00A7\u00A7"
			+ "L:keyboardcat\u00A7http://instantsfun.es/keyboardcat\u00A7\u00A7"
			+ "L:khaaan\u00A7http://instantsfun.es/khaaan\u00A7\u00A7"
			+ "L:lalalalala\u00A7http://instantsfun.es/lalalalala\u00A7\u00A7"
			+ "L:lazor\u00A7http://instantsfun.es/lazor\u00A7\u00A7"
			+ "L:legendary\u00A7http://instantsfun.es/legendary\u00A7\u00A7"
			+ "L:leroy\u00A7http://instantsfun.es/leroy\u00A7\u00A7"
			+ "L:mario\u00A7http://instantsfun.es/mario\u00A7\u00A7"
			+ "L:metalgearsolid\u00A7http://instantsfun.es/metalgearsolid\u00A7\u00A7"
			+ "L:mlb\u00A7http://instantsfun.es/mlb\u00A7\u00A7"
			+ "L:muppets\u00A7http://instantsfun.es/muppets\u00A7\u00A7"
			+ "L:murloc\u00A7http://instantsfun.es/murloc\u00A7\u00A7"
			+ "L:nooo\u00A7http://instantsfun.es/nooo\u00A7\u00A7"
			+ "L:ommmm\u00A7http://instantsfun.es/ommmm\u00A7\u00A7"
			+ "L:omnom\u00A7http://instantsfun.es/omnom\u00A7\u00A7"
			+ "L:over9000\u00A7http://instantsfun.es/over9000\u00A7\u00A7"
			+ "L:penny\u00A7http://instantsfun.es/penny\u00A7\u00A7"
			+ "L:r2d2\u00A7http://instantsfun.es/r2d2\u00A7\u00A7"
			+ "L:sadtrombone\u00A7http://instantsfun.es/sadtrombone\u00A7\u00A7"
			+ "L:sadtuba\u00A7http://instantsfun.es/sadtuba\u00A7\u00A7"
			+ "L:shhahh\u00A7http://instantsfun.es/shhahh\u00A7\u00A7"
			+ "L:shutup\u00A7http://instantsfun.es/shutup\u00A7\u00A7"
			+ "L:swanee\u00A7http://instantsfun.es/swanee\u00A7\u00A7"
			+ "L:tada\u00A7http://instantsfun.es/tada\u00A7\u00A7"
			+ "L:thisissparta\u00A7http://instantsfun.es/thisissparta\u00A7\u00A7"
			+ "L:trollolol\u00A7http://instantsfun.es/trollolol\u00A7\u00A7"
			+ "L:tumbleweed\u00A7http://instantsfun.es/tumbleweed\u00A7\u00A7"
			+ "L:victoryff\u00A7http://instantsfun.es/victoryff\u00A7\u00A7"
			+ "L:wakawaka\u00A7http://instantsfun.es/wakawaka\u00A7\u00A7"
			+ "L:wilhelm\u00A7http://instantsfun.es/wilhelm\u00A7\u00A7"
			+ "L:wololo\u00A7http://instantsfun.es/wololo\u00A7\u00A7"
			+ "L:wrong\u00A7http://instantsfun.es/wrong\u00A7\u00A7"
			+ "L:youarepirate\u00A7http://instantsfun.es/youarepirate\u00A7\u00A7"
			+ "L:zas\u00A7http://instantsfun.es/zas\u00A7\u00A7"
			+ "L:zasca\u00A7http://instantsfun.es/zasca\u00A7\u00A7"
			+ "L:zeldaitem\u00A7http://instantsfun.es/zeldaitem\u00A7\u00A7"
			+ "L:zeldasecret\u00A7http://instantsfun.es/zeldasecret\u00A7\u00A7"
			+ "";

	return Group.deserializePack(str);
};

StaticData.loadSmilEOL = function() {

	var str = "SmilEOL\u00A7\u00A7\u00A7"
		 + "I:NeutralFace_\u00A7http://i44.tinypic.com/1yn2up.png\u00A7[size=50]{1}[/size]\u00A7{1}\u00A7\u00A7"
		 + "I:TrollX2_\u00A7http://i41.tinypic.com/okr23t.png\u00A7[size=50]{2}[/size]\u00A7{2}\u00A7\u00A7"
		 + "I:Cry_\u00A7http://i40.tinypic.com/23mrk7q.png\u00A7[size=50]{3}[/size]\u00A7{3}\u00A7\u00A7"
		 + "I:Happy_\u00A7http://i41.tinypic.com/2uekzus.png\u00A7[size=50]{4}[/size]\u00A7{4}\u00A7\u00A7"
		 + "I:Jur_\u00A7http://i41.tinypic.com/2w2kgic.png\u00A7[size=50]{5}[/size]\u00A7{5}\u00A7\u00A7"
		 + "I:Angry_\u00A7http://i39.tinypic.com/2a8q42r.png\u00A7[size=50]{6}[/size]\u00A7{6}\u00A7\u00A7"
		 + "I:Tururu_\u00A7http://i39.tinypic.com/2nuhle0.png\u00A7[size=50]{7}[/size]\u00A7{7}\u00A7\u00A7"
		 + "I:Ehm_\u00A7http://i44.tinypic.com/2zhmxy8.png\u00A7[size=50]{8}[/size]\u00A7{8}\u00A7\u00A7"
		 + "I:brrr_\u00A7http://i42.tinypic.com/2lnfkp1.png\u00A7[size=50]{0}[/size]\u00A7{0}\u00A7\u00A7"
		 + "I:Hitlerface_\u00A7http://i40.tinypic.com/de7ksm.png\u00A7[size=50]{9}[/size]\u00A7{9}\u00A7\u00A7"
		 + "I:Retard_\u00A7http://i40.tinypic.com/waq2k6.png\u00A7[size=50]{10}[/size]\u00A7{10}\u00A7\u00A7"
		 + "I:Oins_\u00A7http://i40.tinypic.com/hukal3.png\u00A7[size=50]{11}[/size]\u00A7{11}\u00A7\u00A7"
		 + "I:Awesome_\u00A7http://i41.tinypic.com/2ynfbit.png\u00A7[size=50]{12}[/size]\u00A7{12}\u00A7\u00A7"
		 + "I:Grr_\u00A7http://i41.tinypic.com/r0y4ic.png\u00A7[size=50]{13}[/size]\u00A7{13}\u00A7\u00A7"
		 + "I:Gayface_\u00A7http://i40.tinypic.com/29fs6xw.png\u00A7[size=50]{14}[/size]\u00A7{14}\u00A7\u00A7"
		 + "I:Custom1_\u00A7http://i32.tinypic.com/vy08cm.jpg\u00A7[size=50]{15}[/size]\u00A7{15}\u00A7\u00A7"
		 + "I:Custom2_\u00A7http://i25.tinypic.com/6zmy5t.jpg\u00A7[size=50]{16}[/size]\u00A7{16}\u00A7\u00A7"
		 + "I:Custom3_\u00A7http://i25.tinypic.com/256gwvd.jpg\u00A7[size=50]{17}[/size]\u00A7{17}\u00A7\u00A7"
		 + "I:Custom4_\u00A7http://i26.tinypic.com/5l9zew.jpg\u00A7[size=50]{18}[/size]\u00A7{18}\u00A7\u00A7"
		 + "I:Custom5_\u00A7http://i29.tinypic.com/mbsq5f.jpg\u00A7[size=50]{19}[/size]\u00A7{19}\u00A7\u00A7"
		 + "I:Custom6_\u00A7http://i32.tinypic.com/50o5z5.jpg\u00A7[size=50]{20}[/size]\u00A7{20}\u00A7\u00A7"
		 + "I:Custom7_\u00A7http://i27.tinypic.com/svs7iq.jpg\u00A7[size=50]{21}[/size]\u00A7{21}\u00A7\u00A7"
		 + "I:Custom8_\u00A7http://i32.tinypic.com/2n0lnkg.jpg\u00A7[size=50]{22}[/size]\u00A7{22}\u00A7\u00A7"
		 + "I:Custom9_\u00A7http://i31.tinypic.com/33e61rl.jpg\u00A7[size=50]{23}[/size]\u00A7{23}\u00A7\u00A7"
		 + "I:Custom10_\u00A7http://i29.tinypic.com/2yw6etw.jpg\u00A7[size=50]{24}[/size]\u00A7{24}\u00A7\u00A7"
		 + "I:Custom11_\u00A7http://i28.tinypic.com/33jqz2w.jpg\u00A7[size=50]{25}[/size]\u00A7{25}\u00A7\u00A7"
		 + "I:Custom12_\u00A7http://i25.tinypic.com/u7qmu.jpg\u00A7[size=50]{26}[/size]\u00A7{26}\u00A7\u00A7"
		 + "I:Custom13_\u00A7http://i31.tinypic.com/153nvb8.jpg\u00A7[size=50]{27}[/size]\u00A7{27}\u00A7\u00A7"
		 + "I:Custom14_\u00A7http://i31.tinypic.com/wn3ia.jpg\u00A7[size=50]{28}[/size]\u00A7{28}\u00A7\u00A7"
		 + "I:Custom15_\u00A7http://i32.tinypic.com/30hy61v.jpg\u00A7[size=50]{29}[/size]\u00A7{29}\u00A7\u00A7"
		 + "I:Custom16_\u00A7http://i25.tinypic.com/2e55e88.jpg\u00A7[size=50]{30}[/size]\u00A7{30}\u00A7\u00A7"
		 + "I:Custom17_\u00A7http://i28.tinypic.com/2rhr2br.jpg\u00A7[size=50]{31}[/size]\u00A7{31}\u00A7\u00A7"
		 + "I:Custom18_\u00A7http://i28.tinypic.com/zx34eb.jpg\u00A7[size=50]{32}[/size]\u00A7{32}\u00A7\u00A7"
		 + "I:Custom19_\u00A7http://i27.tinypic.com/wl6qvs.jpg\u00A7[size=50]{33}[/size]\u00A7{33}\u00A7\u00A7"
		 + "I:Custom20_\u00A7http://i31.tinypic.com/xpovop.jpg\u00A7[size=50]{34}[/size]\u00A7{34}\u00A7\u00A7"
		 + "I:Custom21_\u00A7http://i25.tinypic.com/4k7d07.jpg\u00A7[size=50]{35}[/size]\u00A7{35}\u00A7\u00A7"
		 + "I:Troll_\u00A7http://i40.tinypic.com/zj6vxv.png\u00A7[size=50]{36}[/size]\u00A7{36}\u00A7\u00A7"
		 + "I:Nobodycares_\u00A7http://i39.tinypic.com/ioiwpy.png\u00A7[size=50]{37}[/size]\u00A7{37}\u00A7\u00A7"
		 + "I:Coolface_\u00A7http://i40.tinypic.com/2yw7sc9.png\u00A7[size=50]{38}[/size]\u00A7{38}\u00A7\u00A7"
		 + "I:Fry_\u00A7http://i44.tinypic.com/4gn79f.png\u00A7[size=50]{39}[/size]\u00A7{39}\u00A7\u00A7"
		 + "I:HA-HA_\u00A7http://i42.tinypic.com/s5wqs1.png\u00A7[size=50]{40}[/size]\u00A7{40}\u00A7\u00A7"
		 + "I:tipoIncognito_\u00A7http://i44.tinypic.com/5x3i88.gif\u00A7[size=50]{41}[/size]\u00A7{41}\u00A7\u00A7"
		 + "I:slowpoke_\u00A7http://i42.tinypic.com/dfwuvb.png\u00A7[size=50]{42}[/size]\u00A7{42}\u00A7\u00A7"
		 + "I:muhaha_\u00A7http://i43.tinypic.com/2qtz9kn.png\u00A7[size=50]{43}[/size]\u00A7{43}\u00A7\u00A7"
		 + "I:mmm1_\u00A7http://i40.tinypic.com/9s9xth.png\u00A7[size=50]{44}[/size]\u00A7{44}\u00A7\u00A7"
		 + "I:snif_\u00A7http://i42.tinypic.com/243ndpe.png\u00A7[size=50]{45}[/size]\u00A7{45}\u00A7\u00A7"
		 + "I:mmm2_\u00A7http://i40.tinypic.com/rle1jo.png\u00A7[size=50]{46}[/size]\u00A7{46}\u00A7\u00A7"
		 + "I:seguroDental_\u00A7http://i42.tinypic.com/zlf0oi.gif\u00A7[size=50]{47}[/size]\u00A7{47}\u00A7\u00A7"
		 + "I:orly_\u00A7http://i41.tinypic.com/152dog5.png\u00A7[size=50]{48}[/size]\u00A7{48}\u00A7\u00A7"
		 + "I:miauMiau_\u00A7http://i39.tinypic.com/2hqrrps.gif\u00A7[size=50]{49}[/size]\u00A7{49}\u00A7\u00A7"
		 + "I:LinkJijiji_\u00A7http://i43.tinypic.com/21croep.png\u00A7[size=50]{50}[/size]\u00A7{50}\u00A7\u00A7"
		 + "I:jiXo_\u00A7http://i43.tinypic.com/xndac4.png\u00A7[size=50]{51}[/size]\u00A7{51}\u00A7\u00A7"
		 + "I:aja_\u00A7http://i41.tinypic.com/e895sn.gif\u00A7[size=50]{52}[/size]\u00A7{52}\u00A7\u00A7"
		 + "I:aaahhh_\u00A7http://i40.tinypic.com/20z5fkw.gif\u00A7[size=50]{53}[/size]\u00A7{53}\u00A7\u00A7"
		 + "I:dawson_\u00A7http://i40.tinypic.com/2hphmkj.gif\u00A7[size=50]{54}[/size]\u00A7{54}\u00A7\u00A7"
		 + "I:bobEsponja_\u00A7http://i42.tinypic.com/2znweav.png\u00A7[size=50]{55}[/size]\u00A7{55}\u00A7\u00A7"
		 + "I:bleh_\u00A7http://i40.tinypic.com/1z13o.png\u00A7[size=50]{56}[/size]\u00A7{56}\u00A7\u00A7"
		 + "I:moralina_\u00A7http://i41.tinypic.com/2dc7ti9.jpg\u00A7[size=50]{57}[/size]\u00A7{57}\u00A7\u00A7"
		 + "I:Facepalm1_\u00A7http://i39.tinypic.com/1e6lix.png\u00A7[size=50]{58}[/size]\u00A7{58}\u00A7\u00A7"
		 + "I:Facepalm2_\u00A7http://i43.tinypic.com/2d56qs.png\u00A7[size=50]{59}[/size]\u00A7{59}\u00A7\u00A7"
		 + "I:blablabla_\u00A7http://i42.tinypic.com/fn71gy.gif\u00A7[size=50]{60}[/size]\u00A7{60}\u00A7\u00A7"
		 + "I:roto2_\u00A7http://i40.tinypic.com/10gkbxf.gif\u00A7[size=50]{61}[/size]\u00A7{61}\u00A7\u00A7"
		 + "I:laleche_\u00A7http://i42.tinypic.com/w2g8b4.gif\u00A7[size=50]{62}[/size]\u00A7{62}\u00A7\u00A7"
		 + "I:jiji_\u00A7http://i40.tinypic.com/1gfzmr.png\u00A7[size=50]{63}[/size]\u00A7{63}\u00A7\u00A7"
		 + "I:popcorn_\u00A7http://i44.tinypic.com/dm8brt.gif\u00A7[size=50]{64}[/size]\u00A7{64}\u00A7\u00A7"
		 + "I:puf_\u00A7http://i43.tinypic.com/2rrbekz.png\u00A7[size=50]{65}[/size]\u00A7{65}\u00A7\u00A7"
		 + "I:vaca_\u00A7http://i44.tinypic.com/30xctip.gif\u00A7[size=50]{66}[/size]\u00A7{66}\u00A7\u00A7"
		 + "I:SabadoSabadete_\u00A7http://i43.tinypic.com/2rrbdwm.gif\u00A7[size=50]{67}[/size]\u00A7{67}\u00A7\u00A7"
		 + "I:buitre_\u00A7http://i41.tinypic.com/11sm8p0.gif\u00A7[size=50]{68}[/size]\u00A7{68}\u00A7\u00A7"
		 + "I:WAHT_\u00A7http://i43.tinypic.com/n50x8h.jpg\u00A7[size=50]{69}[/size]\u00A7{69}\u00A7\u00A7"
		 + "I:Ujujum1_\u00A7http://i39.tinypic.com/2prfed4.jpg\u00A7[size=50]{70}[/size]\u00A7{70}\u00A7\u00A7"
		 + "I:Ujujum2_\u00A7http://i44.tinypic.com/2m6sxvd.jpg\u00A7[size=50]{71}[/size]\u00A7{71}\u00A7\u00A7"
		 + "I:Lloron_\u00A7http://i43.tinypic.com/2ueqlis.gif\u00A7[size=50]{72}[/size]\u00A7{72}\u00A7\u00A7"
		 + "I:Sing_\u00A7http://i39.tinypic.com/o5829u.gif\u00A7[size=50]{73}[/size]\u00A7{73}\u00A7\u00A7"
		 + "I:eaea_\u00A7http://i40.tinypic.com/znwrpx.gif\u00A7[size=50]{74}[/size]\u00A7{74}\u00A7\u00A7"
		 + "I:ueueue_\u00A7http://i43.tinypic.com/20r1ixu.jpg\u00A7[size=50]{75}[/size]\u00A7{75}\u00A7\u00A7"
		 + "I:nose_\u00A7http://i40.tinypic.com/9gjc6p.gif\u00A7[size=50]{76}[/size]\u00A7{76}\u00A7\u00A7"
		 + "I:facepalm_\u00A7http://i44.tinypic.com/fc0m6b.gif\u00A7[size=50]{77}[/size]\u00A7{77}\u00A7\u00A7"
		 + "I:melafo_\u00A7http://i41.tinypic.com/9zn9r9.jpg\u00A7[size=50]{78}[/size]\u00A7{78}\u00A7\u00A7"
		 + "I:jajano_\u00A7http://i43.tinypic.com/o5ayvr.gif\u00A7[size=50]{79}[/size]\u00A7{79}\u00A7\u00A7"
		 + "I:sisisi_\u00A7http://i42.tinypic.com/28bs2ut.gif\u00A7[size=50]{80}[/size]\u00A7{80}\u00A7\u00A7"
		 + "I:ponno_\u00A7http://i43.tinypic.com/9895vl.gif\u00A7[size=50]{81}[/size]\u00A7{81}\u00A7\u00A7"
		 + "I:Respeto_\u00A7http://i39.tinypic.com/9zqcn9.gif\u00A7[size=50]{82}[/size]\u00A7{82}\u00A7\u00A7"
		 + "I:Bate_\u00A7http://i40.tinypic.com/vfh5xg.gif\u00A7[size=50]{83}[/size]\u00A7{83}\u00A7\u00A7"
		 + "I:Palomitas_\u00A7http://i40.tinypic.com/104jn92.jpg\u00A7[size=50]{84}[/size]\u00A7{84}\u00A7\u00A7"
		 + "I:Silencio_\u00A7http://i39.tinypic.com/1z6un9e.jpg\u00A7[size=50]{85}[/size]\u00A7{85}\u00A7\u00A7"
		 + "I:melaFB_\u00A7http://i45.tinypic.com/w8py7r.jpg\u00A7[size=50]{86}[/size]\u00A7{86}\u00A7\u00A7"
		 + "I:meloFB_\u00A7http://i49.tinypic.com/xgidj7.jpg\u00A7[size=50]{87}[/size]\u00A7{87}\u00A7\u00A7"
		 + "I:thisisP_\u00A7http://i46.tinypic.com/2w5n9ye.jpg\u00A7[size=50]{88}[/size]\u00A7{88}\u00A7\u00A7"
		 + "I:pedobear_\u00A7http://i47.tinypic.com/9pqds5.jpg\u00A7[size=50]{89}[/size]\u00A7{89}\u00A7\u00A7";
	return Group.deserializePack(str);
};

StaticData.loadDefaultEOL = function() {

	var str = "EOL\u00A7\u00A7\u00A7"
			+ "I:sonriendo\u00A7http://www.elotrolado.net/images/smilies/smile.gif\u00A7:)\u00A7.\u00A7\u00A7"
			+ "I:triste\u00A7http://www.elotrolado.net/images/smilies/frown.gif\u00A7:(\u00A7.\u00A7\u00A7"
			+ "I:embarazoso\u00A7http://www.elotrolado.net/images/smilies/redface.gif\u00A7:o\u00A7.\u00A7\u00A7"
			+ "I:guinhando un ojo\u00A7http://www.elotrolado.net/images/smilies/wink.gif\u00A7;)\u00A7.\u00A7\u00A7"
			+ "I:sacando la lengua\u00A7http://www.elotrolado.net/images/smilies/tongue.gif\u00A7:p\u00A7.\u00A7\u00A7"
			+ "I:cool\u00A7http://www.elotrolado.net/images/smilies/cool.gif\u00A7:cool:\u00A7.\u00A7\u00A7"
			+ "I:sonrisa de compromiso\u00A7http://www.elotrolado.net/images/smilies/rolleyes.gif\u00A7:-|\u00A7.\u00A7\u00A7"
			+ "I:furioso\u00A7http://www.elotrolado.net/images/smilies/mad.gif\u00A7}:/\u00A7.\u00A7\u00A7"
			+ "I:asombrado\u00A7http://www.elotrolado.net/images/smilies/eek.gif\u00A7:O\u00A7.\u00A7\u00A7"
			+ "I:confuso\u00A7http://www.elotrolado.net/images/smilies/confused.gif\u00A7:-?\u00A7.\u00A7\u00A7"
			+ "I:parti\u00E9ndose\u00A7http://www.elotrolado.net/images/smilies/biggrin.gif\u00A7XD\u00A7.\u00A7\u00A7"
			+ "I:como la ni\u00F1a del exorcista\u00A7http://www.elotrolado.net/images/smilies/nuevos/vueltas.gif\u00A7[360º]\u00A7.\u00A7\u00A7"
			+ "I:llorica\u00A7http://www.elotrolado.net/images/smilies/nuevos/triste_ani4.gif\u00A7[mamaaaaa]\u00A7.\u00A7\u00A7"
			+ "I:a l\u00E1grima viva\u00A7http://www.elotrolado.net/images/smilies/nuevos/triste_ani3.gif\u00A7[buuuaaaa]\u00A7.\u00A7\u00A7"
			+ "I:trist\u00F3n\u00A7http://www.elotrolado.net/images/smilies/nuevos/triste_ani2.gif\u00A7[triston]\u00A7.\u00A7\u00A7"
			+ "I:llorando\u00A7http://www.elotrolado.net/images/smilies/nuevos/triste_ani1.gif\u00A7[snif]\u00A7.\u00A7\u00A7"
			+ "I:Ala!\u00A7http://www.elotrolado.net/images/smilies/nuevos/sorprendido_ani2.gif\u00A7[Alaa!]\u00A7.\u00A7\u00A7"
			+ "I:Oooooo\u00A7http://www.elotrolado.net/images/smilies/nuevos/sorprendido_ani1.gif\u00A7[Ooooo]\u00A7.\u00A7\u00A7"
			+ "I:enrojecido\u00A7http://www.elotrolado.net/images/smilies/nuevos/sonrojado_ani1.gif\u00A7[ayay]\u00A7.\u00A7\u00A7"
			+ "I:risa con gafas\u00A7http://www.elotrolado.net/images/smilies/nuevos/sonrisa_ani2.gif\u00A7[chulito]\u00A7.\u00A7\u00A7"
			+ "I:risita\u00A7http://www.elotrolado.net/images/smilies/nuevos/sonrisa_ani1.gif\u00A7[risita]\u00A7.\u00A7\u00A7"
			+ "I:buenazo\u00A7http://www.elotrolado.net/images/smilies/nuevos/risa_tonta.gif\u00A7[buenazo]\u00A7.\u00A7\u00A7"
			+ "I:m\u00E1s risas\u00A7http://www.elotrolado.net/images/smilies/nuevos/risa_ani3.gif\u00A7[+risas]\u00A7.\u00A7\u00A7"
			+ "I:carcajada\u00A7http://www.elotrolado.net/images/smilies/nuevos/risa_ani2.gif\u00A7[carcajad]\u00A7.\u00A7\u00A7"
			+ "I:sonrisa\u00A7http://www.elotrolado.net/images/smilies/nuevos/risa_ani1.gif\u00A7[sonrisa]\u00A7.\u00A7\u00A7"
			+ "I:reojo\u00A7http://www.elotrolado.net/images/smilies/nuevos/reojo.gif\u00A7¬_¬\u00A7.\u00A7\u00A7"
			+ "I:pelota\u00A7http://www.elotrolado.net/images/smilies/nuevos/pelota_ani1.gif\u00A7[boing]\u00A7.\u00A7\u00A7"
			+ "I:loco\u00A7http://www.elotrolado.net/images/smilies/nuevos/miedo.gif\u00A7[mad]\u00A7.\u00A7\u00A7"
			+ "I:malo\u00A7http://www.elotrolado.net/images/smilies/nuevos/malo_ani1.gif\u00A7[bad]\u00A7.\u00A7\u00A7"
			+ "I:comor?\u00A7http://www.elotrolado.net/images/smilies/nuevos/interro_ani1.gif\u00A7[comor?]\u00A7.\u00A7\u00A7"
			+ "I:calabaza\u00A7http://www.elotrolado.net/images/smilies/nuevos/hallowen.gif\u00A7[hallow]\u00A7.\u00A7\u00A7"
			+ "I:gui\u00F1ando\u00A7http://www.elotrolado.net/images/smilies/nuevos/guinyo_ani1.gif\u00A7[ginyo]\u00A7.\u00A7\u00A7"
			+ "I:muy furioso\u00A7http://www.elotrolado.net/images/smilies/nuevos/furioso.gif\u00A7[+furioso]\u00A7.\u00A7\u00A7"
			+ "I:fumando\u00A7http://www.elotrolado.net/images/smilies/nuevos/fumando.gif\u00A7[fumando]\u00A7.\u00A7\u00A7"
			+ "I:enfadado\u00A7http://www.elotrolado.net/images/smilies/nuevos/enfado_ani1.gif\u00A7[enfado1]\u00A7.\u00A7\u00A7"
			+ "I:enamorado\u00A7http://www.elotrolado.net/images/smilies/nuevos/enamorado.gif\u00A7[amor]\u00A7.\u00A7\u00A7"
			+ "I:durmiendo\u00A7http://www.elotrolado.net/images/smilies/nuevos/durmiendo.gif\u00A7ZzzZZ\u00A7.\u00A7\u00A7"
			+ "I:por aqu\u00ED!\u00A7http://www.elotrolado.net/images/smilies/nuevos/dedos.gif\u00A7[poraki]\u00A7.\u00A7\u00A7"
			+ "I:careto?\u00A7http://www.elotrolado.net/images/smilies/nuevos/careto_ani1.gif\u00A7[careto?]\u00A7.\u00A7\u00A7"
			+ "I:burla3\u00A7http://www.elotrolado.net/images/smilies/nuevos/burla_ani2.gif\u00A7[burla3]\u00A7.\u00A7\u00A7"
			+ "I:burla2\u00A7http://www.elotrolado.net/images/smilies/nuevos/burla_ani1.gif\u00A7[burla2]\u00A7.\u00A7\u00A7"
			+ "I:borracho\u00A7http://www.elotrolado.net/images/smilies/nuevos/borracho_ani1.gif\u00A7[borracho]\u00A7.\u00A7\u00A7"
			+ "I:angelito\u00A7http://www.elotrolado.net/images/smilies/nuevos/angelito.gif\u00A7[angelito]\u00A7.\u00A7\u00A7"
			+ "I:adios\u00A7http://www.elotrolado.net/images/smilies/nuevos2/adio.gif\u00A7[bye]\u00A7.\u00A7\u00A7"
			+ "I:alien\u00A7http://www.elotrolado.net/images/smilies/nuevos2/alien.gif\u00A7[alien]\u00A7.\u00A7\u00A7"
			+ "I:sonrisa\u00A7http://www.elotrolado.net/images/smilies/nuevos2/biggrin2.gif\u00A7:D\u00A7.\u00A7\u00A7"
			+ "I:bomba\u00A7http://www.elotrolado.net/images/smilies/nuevos2/bomba.gif\u00A7[boma]\u00A7.\u00A7\u00A7"
			+ "I:loco\u00A7http://www.elotrolado.net/images/smilies/nuevos2/borracho.gif\u00A7[looco]\u00A7.\u00A7\u00A7"
			+ "I:brindis\u00A7http://www.elotrolado.net/images/smilies/nuevos2/brindando.gif\u00A7[beer]\u00A7.\u00A7\u00A7"
			+ "I:enfadado\u00A7http://www.elotrolado.net/images/smilies/nuevos2/cabreo.gif\u00A7[enfa]\u00A7.\u00A7\u00A7"
			+ "I:cartman\u00A7http://www.elotrolado.net/images/smilies/nuevos2/cartman.gif\u00A7[cartman]\u00A7.\u00A7\u00A7"
			+ "I:cawento\u00A7http://www.elotrolado.net/images/smilies/nuevos2/cawento.gif\u00A7cawento\u00A7.\u00A7\u00A7"
			+ "I:cu\u00F1aaaaaooooo\u00A7http://www.elotrolado.net/images/smilies/nuevos2/cunyao.gif\u00A7:Ð\u00A7.\u00A7\u00A7"
			+ "I:decaido\u00A7http://www.elotrolado.net/images/smilies/nuevos2/decaido.gif\u00A7[decaio]\u00A7.\u00A7\u00A7"
			+ "I:del resves\u00A7http://www.elotrolado.net/images/smilies/nuevos2/delreves.gif\u00A7[reves]\u00A7.\u00A7\u00A7"
			+ "I:demoniaco\u00A7http://www.elotrolado.net/images/smilies/nuevos2/demonio.gif\u00A7[sati]\u00A7.\u00A7\u00A7"
			+ "I:discutiendo\u00A7http://www.elotrolado.net/images/smilies/nuevos2/discutiendo.gif\u00A7[discu]\u00A7.\u00A7\u00A7"
			+ "I:otro q duerme\u00A7http://www.elotrolado.net/images/smilies/nuevos2/dormido.gif\u00A7[maszz]\u00A7.\u00A7\u00A7"
			+ "I:Adorando\u00A7http://www.elotrolado.net/images/smilies/adora.gif\u00A7[tadoramo]\u00A7.\u00A7\u00A7"
			+ "I:asombrillo\u00A7http://www.elotrolado.net/images/smilies/nuevos2/eek.gif\u00A7Oooh\u00A7.\u00A7\u00A7"
			+ "I:enamorados\u00A7http://www.elotrolado.net/images/smilies/nuevos2/enamoraos.gif\u00A7[inlove]\u00A7.\u00A7\u00A7"
			+ "I:fiesta\u00A7http://www.elotrolado.net/images/smilies/nuevos2/fiesta.gif\u00A7[fies]\u00A7.\u00A7\u00A7"
			+ "I:metralleta\u00A7http://www.elotrolado.net/images/smilies/nuevos2/flamethrower.gif\u00A7ratataaaa\u00A7.\u00A7\u00A7"
			+ "I:flipando\u00A7http://www.elotrolado.net/images/smilies/nuevos2/flipando.gif\u00A7[flipa]\u00A7.\u00A7\u00A7"
			+ "I:idea\u00A7http://www.elotrolado.net/images/smilies/nuevos2/idea.gif\u00A7[idea]\u00A7.\u00A7\u00A7"
			+ "I:uf\u00A7http://www.elotrolado.net/images/smilies/nuevos2/infeliz.gif\u00A7[agggtt]\u00A7.\u00A7\u00A7"
			+ "I:karateka\u00A7http://www.elotrolado.net/images/smilies/nuevos2/karateka.gif\u00A7[chiu]\u00A7.\u00A7\u00A7"
			+ "I:maloso\u00A7http://www.elotrolado.net/images/smilies/nuevos2/masmalo.gif\u00A7[666]\u00A7.\u00A7\u00A7"
			+ "I:potando\u00A7http://www.elotrolado.net/images/smilies/nuevos2/masvomitos.gif\u00A7[lapota]\u00A7.\u00A7\u00A7"
			+ "I:no\u00A7http://www.elotrolado.net/images/smilies/nuevos2/nop.gif\u00A7[nop]\u00A7.\u00A7\u00A7"
			+ "I:ok\u00A7http://www.elotrolado.net/images/smilies/nuevos2/okis.gif\u00A7[ok]\u00A7.\u00A7\u00A7"
			+ "I:reojillo\u00A7http://www.elotrolado.net/images/smilies/nuevos2/ooooops.gif\u00A7[reojillo]\u00A7.\u00A7\u00A7"
			+ "I:otra sonrisa\u00A7http://www.elotrolado.net/images/smilies/nuevos2/otrasonrisa.gif\u00A7[jaja]\u00A7.\u00A7\u00A7"
			+ "I:fumeteo\u00A7http://www.elotrolado.net/images/smilies/nuevos2/otrofumeta.gif\u00A7[fumeta]\u00A7.\u00A7\u00A7"
			+ "I:pescador?\u00A7http://www.elotrolado.net/images/smilies/nuevos2/pimp.gif\u00A7[pos eso]\u00A7.\u00A7\u00A7"
			+ "I:machacando\u00A7http://www.elotrolado.net/images/smilies/nuevos2/rompiendo.gif\u00A7[toctoc]\u00A7.\u00A7\u00A7"
			+ "I:toma\u00A7http://www.elotrolado.net/images/smilies/nuevos2/tomaa.gif\u00A7[tomaaa]\u00A7.\u00A7\u00A7"
			+ "I:uzi\u00A7http://www.elotrolado.net/images/smilies/nuevos2/uzi.gif\u00A7[uzi]\u00A7.\u00A7\u00A7"
			+ "I:mas potas\u00A7http://www.elotrolado.net/images/smilies/nuevos2/vomitivo.gif\u00A7[buaaj]\u00A7.\u00A7\u00A7"
			+ "I:Catal\u00E1n\u00A7http://www.elotrolado.net/images/smilies/nuevos/barretina.gif\u00A7[barret]\u00A7.\u00A7\u00A7"
			+ "I:Babeando\u00A7http://www.elotrolado.net/images/smilies/babas.gif\u00A7[babas]\u00A7.\u00A7\u00A7"
			+ "I:Duda\u00A7http://www.elotrolado.net/images/smilies/net_duda.gif\u00A7ein?\u00A7.\u00A7\u00A7"
			+ "I:Que me parto!\u00A7http://www.elotrolado.net/images/smilies/net_quemeparto.gif\u00A7[qmparto]\u00A7.\u00A7\u00A7"
			+ "I:Nop\u00A7http://www.elotrolado.net/images/smilies/net_thumbsdown.gif\u00A7[noop]\u00A7.\u00A7\u00A7"
			+ "I:Ok!\u00A7http://www.elotrolado.net/images/smilies/net_thumbsup.gif\u00A7[oki]\u00A7.\u00A7\u00A7"
			+ "I:Aplausos\u00A7http://www.elotrolado.net/images/smilies/aplauso.gif\u00A7[plas]\u00A7.\u00A7\u00A7"
			+ "I:Lee!\u00A7http://www.elotrolado.net/images/smilies/rtfm.gif\u00A7[rtfm]\u00A7.\u00A7\u00A7"
			+ "";

	return Group.deserializePack(str);
};

// muestra/oculta un elemento.
var changeVisible = function(elementId) {

	var element = document.getElementById(elementId);

	// Esto es mas guay pero no funciona en greasemonkey... guay, eh?
	// alert(element.visible);
	// if (element.visible) {
	// element.style.display = "none";
	// } else {
	// element.style.display = "block";
	// }
	// element.visible = !element.visible;

	if (element.style.display == "none") {
		element.style.display = "block";
	} else {
		element.style.display = "none";
	}
};

var setFunction = function(e, cb, arg0) {

	e.addEventListener("click", function() {

		cb(arg0);
	}, false);
};

// genera el cuadro de selecci\u00F3n a partir de una lista de grupos.
function getGroups(groups) {

	var outlist = document.createElement("div");
	outlist.id = "smiley-list";
	outlist.style.height = "184px";
	outlist.style.overflow = "auto";
	outlist.style.diplay = "block";

	var first = true;
	for ( var groupKey in _groups) {
		var group = _groups[groupKey];

		var a = document.createElement("a");
		a.setAttribute("href", "javascript:void(0)");
		var id = "smilEOL-" + group.name;

		setFunction(a, changeVisible, id);

		var strong = document.createElement("strong");
		strong.appendChild(document.createTextNode(group.name));
		a.appendChild(strong);

		var div = document.createElement("div");
		div.setAttribute("id", id);

		if (first) {
			div.visible = true;
			div.style.display = "block";
			first = !first;
		} else {
			div.visible = false;
			div.style.display = "none";
		}

		for ( var j = 0; j < group.elements.length; j++) {
			var e = group.elements[j];
			div.appendChild(e.getElement());
		}

		outlist.appendChild(a);
		outlist.appendChild(div);
		outlist.appendChild(document.createElement("br"));
	}

	return outlist;
};

// genera el cuadro de administraci\u00F3n.
function getManagement() {

	var outlist = document.createElement("div");
	outlist.id = "smiley-mgmt";
	outlist.style.height = "184px";
	outlist.style.overflow = "auto";
	outlist.style.display = "none";

	var table = document.createElement("table");
	table.style.width = "100%";

	var tr1 = table.insertRow(0);
	var td1 = tr1.insertCell(0);
	td1.rowSpan = 4;
	td1.id = "smiley-mgmt-td-select";

	var td2 = tr1.insertCell(1);
	var a_up = buildA_UP();
	td2.appendChild(a_up);

	var tr2 = table.insertRow(1);
	var td3 = tr2.insertCell(0);
	var a_del = buildA_DEL();
	td3.appendChild(a_del);

	var tr3 = table.insertRow(2);
	var td4 = tr3.insertCell(0);
	var a_down = buildA_DOWN();
	td4.appendChild(a_down);

	var tr4 = table.insertRow(3);
	var td5 = tr4.insertCell(0);
	var a_add = buildA_ADD();
	td5.appendChild(a_add);

	var select = buildSelectGroup();
	td1.appendChild(select);
	outlist.appendChild(table);

	var save = document.createElement("input");
	save.type = "button";
	save.value = "Guardar";
	save.setAttribute("class", "button2");
	save.addEventListener("click", function() {

		replaceBox();
		saveData();
	}, false);

	var cancel = document.createElement("input");
	cancel.type = "button";
	cancel.value = "Cancelar";
	cancel.setAttribute("class", "button2");
	cancel.addEventListener("click", function() {

		_groups = loadData();
		replaceBox();
	}, false);

	var reset = document.createElement("input");
	reset.type = "button";
	reset.value = "Reset";
	reset.setAttribute("class", "button2");
	reset
			.addEventListener(
					"click",
					function() {

						if (confirm("Est\u00E1s seguro de querer borrar toda la configuraci\u00F3n")) {
							resetData();
						}

					}, false);

	var a_import = buildA_IMPORT();
	var a_export = buildA_EXPORT();
	var a_icons = buildA_ICON();

	outlist.appendChild(document.createElement("br"));
	// outlist.appendChild(a_icons);
	outlist.appendChild(document.createElement("br"));
	outlist.appendChild(a_import);
	outlist.appendChild(document.createElement("br"));
	outlist.appendChild(a_export);

	outlist.appendChild(document.createElement("br"));
	outlist.appendChild(document.createElement("br"));
	outlist.appendChild(save);
	outlist.appendChild(cancel);
	outlist.appendChild(reset);

	return outlist;
};

var updateSelectGroup = function() {

	var option = document.getElementById("smiley-mgmt-groups");
	var e = document.getElementById("smiley-mgmt-td-select");
	var sel = buildSelectGroup();
	e.replaceChild(sel, option);
	return sel;
};

var buildA_UP = function() {

	var a_up = document.createElement("input");
	a_up.type = "button";
	a_up.value = "\u25B2";
	a_up.title = "Mover hacia arriba";
	a_up.setAttribute("class", "button2");
	a_up.style.fontFamily = "Courier New, Monospace";
	a_up.style.fontSize = "16px";
	a_up.style.height = "20px";
	a_up.addEventListener("click", function() {

		var option = document.getElementById("smiley-mgmt-groups");
		var groupKey = option.value;

		if (groupKey == null || groupKey == "") {
			return;
		}

		var g = getMapAsArray(_groups);
		var selIndex = shiftGroups(g, _groups[groupKey], true);
		_groups = groupsArrayToMap(g);

		var sel = updateSelectGroup();
		sel.value = option.value;
		setTimeout(function() {

			sel.selectedIndex = selIndex;
		}, 10);
		sel.selectedIndex = selIndex;
	}, false);
	return a_up;

};

var buildA_DOWN = function() {

	var a_down = document.createElement("input");
	a_down.type = "button";
	a_down.value = "\u25BC";
	a_down.title = "Mover hacia abajo";
	a_down.setAttribute("class", "button2");
	a_down.style.fontFamily = "Courier New, Monospace";
	a_down.style.fontSize = "16px";
	a_down.style.height = "20px";
	a_down.addEventListener("click", function() {

		var option = document.getElementById("smiley-mgmt-groups");
		var groupKey = option.value;

		if (groupKey == null || groupKey == "") {
			return;
		}

		var g = getMapAsArray(_groups);
		var selIndex = shiftGroups(g, _groups[groupKey], false);
		_groups = groupsArrayToMap(g);

		var sel = updateSelectGroup();
		sel.value = option.value;

		// Peque\u00F1a \u00F1apa, si va deasiado r\u00E1pido no actualiza la
		// posici\u00F3n
		setTimeout(function() {

			sel.selectedIndex = selIndex;
		}, 10);
		sel.selectedIndex = selIndex;
	}, false);
	return a_down;
};

var buildA_DEL = function() {

	var a_del = document.createElement("input");
	a_del.type = "button";
	a_del.value = "-";
	a_del.title = "Borrar grupo";
	a_del.setAttribute("class", "button2");
	a_del.style.fontFamily = "Courier New, Monospace";
	a_del.style.fontSize = "16px";
	a_del.style.height = "20px";
	a_del.addEventListener("click", function() {

		var option = document.getElementById("smiley-mgmt-groups");
		var groupKey = option.value;

		if (groupKey == null || groupKey == "") {
			return;
		}

		delete _groups[groupKey];
		var sel = updateSelectGroup();

	}, false);
	return a_del;
};

var buildA_ADD = function() {

	var a_add = document.createElement("input");
	a_add.type = "button";
	a_add.value = "+";
	a_add.title = "A\u00F1adir grupo";
	a_add.setAttribute("class", "button2");
	a_add.style.fontFamily = "Courier New, Monospace";
	a_add.style.fontSize = "16px";
	a_add.style.height = "20px";
	a_add.addEventListener("click", function() {

		var name = prompt("Define un nombre para el grupo");
		var r = /[^\u00A7]*/;
		if ((name != null) && r.test(name) && (_groups[name] == null)) {
			_groups[name] = new Group(name);
		} else {
			alert(name + " no es un nombre v\u00E1lido o ya existe");
		}

		var sel = updateSelectGroup();
		sel.value = name;
		// Peque\u00F1a \u00F1apa, si va deasiado r\u00E1pido no actualiza la
		// posici\u00F3n
		setTimeout(function() {

			sel.selectedIndex = sel.length - 1;
		}, 10);
		sel.selectedIndex = sel.length - 1;
	}, false);
	return a_add;
};

var buildA_ICON = function() {

	var a_icons = document.createElement("a");
	a_icons.href = "javascript:void(0)";
	a_icons.addEventListener("click", function() {

	}, false);
	a_icons.innerHTML = "<strong>Administrar elementos</strong>";
	return a_icons;
};

var buildA_IMPORT = function() {

	var a_import = document.createElement("a");
	a_import.href = "javascript:void(0)";
	a_import.addEventListener("click", function() {

		var str = prompt("Pega aqu\u00ED el c\u00F3digo del iconpack");
		try {
			var g = Group.deserializePack(str);
			_groups[g.name] = g;
			var sel = updateSelectGroup();
			// Peque\u00F1a \u00F1apa, si va deasiado r\u00E1pido no actualiza la
			// posici\u00F3n
			setTimeout(function() {

				sel.selectedIndex = sel.length - 1;
			}, 10);
			sel.selectedIndex = sel.length - 1;
		} catch (e) {
			alert("iconpack inv\u00E1lido: " + e);
		}
	}, false);
	a_import.innerHTML = "<strong>Importar iconpack</strong>";
	return a_import;
};

var buildA_EXPORT = function() {

	var a_export = document.createElement("a");
	a_export.href = "javascript:void(0)";
	a_export.addEventListener("click", function() {

		var option = document.getElementById("smiley-mgmt-groups");
		var groupKey = option.value;

		if (groupKey == null || groupKey == "") {
			return;
		}

		var group = _groups[groupKey];
		var code = group.serializeGroup();
		var str = prompt("Copia y guarda en alguna parte este c\u00F3digo",
				code);
	}, false);
	a_export.innerHTML = "<strong>Exportar como iconpack</strong>";
	return a_export;
};

var buildSelectGroup = function() {

	var select = document.createElement("select");
	select.id = "smiley-mgmt-groups";
	select.size = 5;
	select.overflow = "hidden";
	select.style.width = "100%";

	for ( var groupKey in _groups) {
		var g = _groups[groupKey];

		var option = document.createElement("option");
		option.id = "option-" + g.name;
		option.value = g.name;
		option.appendChild(document.createTextNode(g.name));

		select.appendChild(option);
	}
	return select;
};

// De un array asociativo saca un array normal.
var getMapAsArray = function(map) {

	var out = new Array();
	var i = 0;

	for ( var gKey in map) {
		out[i++] = map[gKey];
	}

	return out;
};

// De un array de Group genera un array asociativo
var groupsArrayToMap = function(array) {

	var out = new Array();

	for ( var i = 0; i < array.length; i++) {
		var g = array[i];

		out[g.name] = g;
	}

	return out;
};

// intercambia dos elementos de un array de Groups;
var shiftGroups = function(groups, group, up) {

	for ( var i = 0; i < groups.length; i++) {
		if (group == groups[i]) {
			var j = (up) ? i - 1 : i + 1;

			if (j < 0 || j >= groups.length) {
				return i;
			}

			var t = groups[j];
			groups[j] = groups[i];
			groups[i] = t;

			return j;
		}
	}
};

// sustituye el cuadro de emoticonos
var replaceBox = function() {

	smileybox.innerHTML = "";
	smileylist = getGroups(_groups);
	smileymgmt = getManagement();

	var a = document.createElement("a");
	a.href = "javascript:void(0);";
	a.title = "manage";
	a.innerHTML = "<strong>Emoticonos:</strong>";
	a.mmode = false;
	a.id = "mmode-select";

	a.addEventListener("click", function() {

		changeMMode();
	}, false);

	smileybox.appendChild(a);
	smileybox.appendChild(document.createElement("hr"));

	smileybox.appendChild(smileylist);
	smileybox.appendChild(smileymgmt);

	smileybox.appendChild(document.createElement("hr"));

	var ar = document.createElement("a");
	ar.href = "#review";
	ar.title = "Revisi\u00F3n del hilo";
	ar.innerHTML = "<strong>Revisi\u00F3n del hilo</strong>";
	smileybox.appendChild(ar);
};

// cambia el modo del cuadro.
var changeMMode = function() {

	var list = document.getElementById("smiley-list");
	var mgmt = document.getElementById("smiley-mgmt");
	var selector = document.getElementById("mmode-select");

	// pufo para que funcione en greasemonkey... lamentable
	// firefox sigue perdiendo puntos y como siga asi acaba al nivel de IE,
	// S\u00ED, Internet Explorer... que triste!
	if (!this.mmode) {
		if (mgmt.style.display == "none") {
			list.style.display = "none";
			mgmt.style.display = "block";
			selector.innerHTML = "<strong>Administrar:</strong>";
		} else {
			list.style.display = "block";
			mgmt.style.display = "none";
			selector.innerHTML = "<strong>Emoticonos:</strong>";
		}
	} else {

		// as\u00ED es como debiera ser.
		if (this.mmode == false) {
			list.style.display = "none";
			mgmt.style.display = "block";
			selector.innerHTML = "<strong>Administrar:</strong>";
		} else {
			list.style.display = "block";
			mgmt.style.display = "none";
			selector.innerHTML = "<strong>Emoticonos:</strong>";
		}

		this.mmode = !this.mmode;
	}
};

// funcionalidad de reemplazo de palabras clave
var replaceKeyWords = function() {

	smileyMapping = getTranslationMap(_groups);
	
	var posts = getElementsByClass(null, "content");
	replaceKeys(posts);

};

var replaceRecursive = function(node) {
	
	for ( var j = 0; j < node.childNodes.length; j++) {
		var e = node.childNodes.item(j);
		
		if (e.nodeType == Node.TEXT_NODE) {
			var text = e.textContent;
			text = text.replace(/<(.*?)>/, "&lt;$1&gt;");
			
			for ( var key in smileyMapping) {
				
				try {
					// escape RegExp operators
					var escKey = key.replace(/([\\()\[\]{}.^$?+*|])/g, "\\$1");
					rgx = new RegExp("(\\s|^|>)" + escKey + "(\\s|$|<)", "g");
					//Exploit fixing
					
					text = text.replace(rgx, "$1" + smileyMapping[key] + "$2");
				} catch (e) {
					// Callarse like a whore.
				}
			}

			var elmnts = getElements(text);
			replaceNode(e.parentNode, elmnts, e);
		}
		if (!(e.tagName && /code/i.test(e.tagName))) {
			replaceRecursive(e);
		}
	}
};

// remplaza una clave por su valor
var replaceKeys = function(elementList) {

	for ( var i = 0; i < elementList.length; i++) {
		var post = elementList[i];
		replaceRecursive(post);
	}

};

// genera el mapa de traducci\u00F3n
var getTranslationMap = function(groups) {

	var out = new Array();

	for ( var name in groups) {
		var g = groups[name];

		for ( var i = 0; i < g.elements.length; i++) {
			var e = g.elements[i];

			if (e instanceof ImageObject) {
				if (e.keyword != ".") {
					var img = new Image();
					img.src = e.url;
					img.alt = e.title;
					img.title = e.title;
					out[e.keyword] = getHTML(img);
				}
			}
		}
	}

	return out;
};

// Utilidad equivalente a getElementsByClassName();
var getElementsByClass = function(parentNode, className) {

	parentNode = (parentNode == null) ? document : parentNode;

	var elements = document.getElementsByTagName("*");
	var out = new Array();

	for ( var i = 0; i < elements.length; i++) {
		if (elements.item(i).className == className) {
			out.push(elements.item(i));
		}
	}

	return out;
};

// Utilidad equivalente a outerHTML
var getHTML = function(e) {

	if (e.outerHTML) {
		return e.outerHTML;
	} else {
		var d = document.createElement("div");
		d.appendChild(e);
		return d.innerHTML;
	}
};

var getElements = function(text) {

	var d = document.createElement("div");
	d.innerHTML = text;
	return d.childNodes;
};

var replaceNode = function(target, news, old) {

	if (news.length > 0) {
		var next = old.nextSibling;
		target.replaceChild(news.item(0).cloneNode(true), old);

		for ( var i = 1; i < news.length; i++) {
			if (next != null) {
				target.insertBefore(news.item(i).cloneNode(true), next);
			} else {
				target.appendChild(news.item(i).cloneNode(true));
			}
		}
	}
};

var replaceInstants = function() {
	
	var rgx = /http:\/\/(?:www.)?instantsfun\.es\/(\w*)/;
	var embed = '<embed src="http://www.instantsfun.es/swf/$1.swf" width="50" height="50" quality="mid" pluginspage="http://www.adobe.com/shockwave/download/download.cgi?P1_Prod_Version=ShockwaveFlash" type="application/x-shockwave-flash" wmode="transparent" title="$2"></embed>';
	
	var divs = getElementsByClass(null, "content");
	for (var i = 0; i < divs.length; i++) {
		var links = divs[i].getElementsByTagName("a");
		for (var j = 0; j < links.length; j++) {
			var m = rgx.exec(links[j].href);
			if (m) {				
				var element = getElements(embed.replace("$1", m[1]).replace("$2", links[j].textContent));
				replaceNode(links[j].parentElement, element, links[j]);
			}
		}
	}	
};

var replaceBoxBetterEOL = function(box, c) {

	if (c > 0) {
		if (box == null) {
			setTimeout(
					function() {
						replaceBoxBetterEOL(document.getElementById("smiley-box"), --c);
					}, 500);
		} else {
			smileybox = box;
			try {
				replaceBox();
			} catch (e) {
				alert("Se ha producido un error en el script bte " + "p_m: "
						+ e);
			}
		}
	}
};

// funcion de entrada
function scriptMain() {
	
	//por si a chrome no le quedan claras las directivas, pero que conste que a mí me funciona.
	//Gracias a NeDark por este consejito

	if (location.host != 'www.elotrolado.net') return;
	init();
	
	//Greasemonkey apesta, creedme
	if (!Node.TEXT_NODE) {
		Node.TEXT_NODE = 3;
	}
	//Hacen lo que les da la gana...
	
	smileyMapping = getTranslationMap(_groups);
		
	if (smileybox == null) {
		replaceBoxBetterEOL(null, 4);
	} else {
		try {
			setTimeout(replaceBox, 1);
		} catch (e) {
			alert("Se ha producido un error en el script " + "p_m: " + e);
		}
	}

	if (location.href.match(/http:\/\/www.elotrolado.net\/hilo.*/)) {
		setTimeout(function() {
			replaceInstants();
			// experimental: ejecutar as\u00EDncronamente		
			replaceKeyWords();			
		}, 1);
		betterEOL();
	}
	return;
}

// Pr\u00F3xima integraci\u00F3n
betterEOL = function() {

	var bE_button = document.createElement('input');
	bE_button.id = "SmilEOL-BetterEOL-iconsFix";
	bE_button.setAttribute('style', "display: none;");
	bE_button.type = "button";
	document.body.appendChild(bE_button);
	bE_button.addEventListener('click', replaceKeyWords, true);
};

// inicio del script
scriptMain();
// fin del script