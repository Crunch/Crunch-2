/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 * 
 * Copyright 2011 Irakli Gozalishvili. All rights reserved.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 * ***** END LICENSE BLOCK ***** */

ace.define('ace/theme/crunch', ['require', 'exports', 'module' , 'ace/lib/dom'], function(ace_require, exports, module) {

exports.isDark = false;
exports.cssClass = "ace-crunch";
exports.cssText = ".ace-crunch .ace_scroller{\
	//background-color: #F4F3F1;\
	background-color: hsl(40, 12%, 96%);\
	color: hsl(200, 10%, 30%);\
}\
.ace-crunch .ace_scroller.ace_scroll-left{\
box-shadow:2px 0 2px 0px rgba(0, 0, 0, 0.2) inset;\
}\
.ace-crunch .ace_gutter {\
background-color: hsl(40, 12%, 96%);\
color: rgba(64,64,64,0.6);\
min-width: 30px;\
}\
.ace-crunch .ace_print-margin {\
width: 1px;\
background: #e8e8e8;\
}\
.ace-crunch .ace_fold {\
background-color: #6B72E6;\
}\
.ace-crunch .ace_cursor {\
border-left: 2px solid black;\
}\
.ace-crunch .ace_overwrite-cursors .ace_cursor {\
border-left: 0px;\
border-bottom: 1px solid black;\
}\
.ace-crunch .ace_invisible {\
color: hsl(40, 12%, 96%);\
}\
.ace-crunch .ace_invisible_eol {\
visibility: hidden;\
}\
.ace-crunch .ace_storage {\
color: #496979;\
}\
.ace-crunch .ace_keyword {\
color: hsl(340, 66%, 38%);\
}\
.ace-crunch .ace_constant {\
color: #a9549b;\
}\
.ace-crunch .ace_invalid {\
background-color: rgba(255, 0, 0, 0.1);\
color: red;\
}\
.ace-crunch .ace_support.ace_function {\
color: hsl(200, 55%, 42%);\
}\
\
.ace-crunch .ace_support.ace_class {\
color: hsl(234, 63%, 55%);\
}\
.ace-crunch .ace_variable {\
color: hsl(258, 45%, 30%);\
/*background: hsla(258, 45%, 30%,0.04);*/\
}\
.ace-crunch .ace_identifier {\
color: hsl(214, 59%, 35%);\
}\
.ace-crunch .ace_string {\
color: hsl(143,66%,27%);/*#336C3E*/\
}\
.ace-crunch .ace_variable.ace_language {\
color: hsl(23,77%,41%);\
background: none;\
}\
.ace-crunch .ace_type {\
color: #15809E;\
}\
.ace-crunch .ace_comment {\
color: #b08a6b;\
}\
.ace-crunch .ace_xml-pe {\
color: rgb(104, 104, 91);\
}\
.ace-crunch .ace_entity.ace_name.ace_function {\
color: hsl(0, 60%, 40%);\
}\
.ace-crunch .ace_markup.ace_heading {\
color: #15809E;\
}\
.ace-crunch .ace_markup.ace_list {\
color:rgb(185, 6, 144);\
}\
.ace-crunch .ace_meta.ace_tag {\
color: hsl(200,10%,30%);\
}\
.ace-crunch .ace_meta.ace_tag-name {\
color: hsl(23,77%,41%);\
}\
.ace-crunch .ace_meta.ace_tag.ace_name {\
color: hsl(214, 59%, 35%);\
}\
.ace-crunch .ace_entity {\
color: hsl(310, 44%, 40%);\
}\
.ace-crunch .ace_marker-layer .ace_selection {\
background: hsl(34, 9%, 86%);\
border-left: 1px solid hsl(34, 19%, 75%);\
border-right: 1px solid hsl(34, 19%, 75%);\
}\
.ace-crunch.ace_multiselect .ace_selection.ace_start {\
box-shadow: 0 0 3px 0px white;\
border-radius: 2px;\
}\
.ace-crunch .ace_marker-layer .ace_step {\
background: rgb(252, 255, 0);\
}\
.ace-crunch .ace_marker-layer .ace_stack {\
background: rgb(164, 229, 101);\
}\
.ace-crunch .ace_marker-layer .ace_bracket {\
/*margin: -1px 0 0 -1px;*/\
border-bottom: 1px solid  hsla(310, 34%,70%,1);\
border-radius: 2px;\
box-sizing: content-box;\
box-shadow: inset 0px 1px 3px 1px hsla(310, 34%,80%,0.9);\
}\
.ace-crunch .ace_marker-layer .ace_active-line {\
background: rgba(0, 0, 0, 0.04)\
}\
.ace-crunch .ace_gutter-active-line {\
background-color : rgba(0, 0, 0, 0.08);\
}\
.ace-crunch .ace_gutter-layer {\
/*width: 100% !important;*/\
}\
.ace-crunch .ace_marker-layer .ace_selected-word {\
background: hsla(0,100%,100%, 0.75);\
border: 1px solid hsla(27,13%,60%,0.5);\
z-index: 10;\
}\
.ace-crunch .ace_indent-guide {\
margin-right: -1px;\
height: 1.5em;\
display: inline-block;\
}\
.ace-crunch .ace_indent-guide:after {\
border-right: 1px solid hsl(0, 0%, 86%);\
float: right;\
height: 100%;\
content: '';\
position: relative;\
}\
";

var dom = ace_require("../lib/dom");
dom.importCssString(exports.cssText, exports.cssClass);
});