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
///
ace.define('ace/theme/crunch-dark', ['require', 'exports', 'module' , 'ace/lib/dom'], function(ace_require, exports, module) {

exports.isDark = true;
exports.cssClass = "ace-crunch-dark";
exports.cssText = "\
.ace-crunch-dark .ace_scroller{\
	//background-color: #F4F3F1;\
	background-color: hsl(40, 2%, 24%);\
	color: hsl(40, 12%, 70%);\
}\
.ace-crunch-dark {\
background-color: hsl(40, 2%, 24%);\
}\
.ace-crunch-dark .ace_scroller.ace_scroll-left{\
box-shadow:2px 0 2px 0px rgba(0, 0, 0, 0.2) inset;\
}\
.ace-crunch-dark .ace_gutter {\
background-color: hsl(40, 2%, 24%);\
color: hsla(40,1%,80%,0.5);\
min-width: 30px;\
}\
.ace-crunch-dark .ace_print-margin {\
width: 1px;\
background: #e8e8e8;\
}\
.ace-crunch-dark .ace_fold {\
background-color: #6B72E6;\
}\
.ace-crunch-dark .ace_cursor {\
border-left: 2px solid hsla(0,100%,100%,0.5);\
}\
.ace-crunch-dark .ace_overwrite-cursors .ace_cursor {\
border-left: 0px;\
border-bottom: 1px solid black;\
}\
.ace-crunch-dark .ace_invisible {\
color: hsl(40, 2%, 24%);\
}\
.ace-crunch-dark .ace_invisible_eol {\
visibility: hidden;\
}\
.ace-crunch-dark .ace_storage {\
color: hsl(200,85%,58%);\
}\
.ace-crunch-dark .ace_keyword {\
color: hsl(345, 75%, 66%);\
}\
.ace-crunch-dark .ace_constant {\
color: hsl(310, 46%, 64%);\
}\
.ace-crunch-dark .ace_invalid {\
background-color: rgba(255, 0, 0, 0.1);\
color: red;\
}\
.ace-crunch-dark .ace_support.ace_function {\
color: hsl(210, 90%, 60%);\
}\
\
.ace-crunch-dark .ace_support.ace_class {\
color: hsl(234, 83%, 69%);\
}\
.ace-crunch-dark .ace_variable {\
color: hsl(258, 55%, 70%);\
/*background: hsla(258, 45%, 30%,0.04);*/\
}\
.ace-crunch-dark .ace_identifier {\
color: hsl(34, 9%, 70%);\
}\
.ace-crunch-dark .ace_string {\
color: hsl(130,41%,52%);/*#336C3E*/\
}\
.ace-crunch-dark .ace_variable.ace_language {\
color: hsl(27,68%,58%);\
background: none;\
}\
.ace-crunch-dark .ace_type {\
color: hsl(190,65%,63%)\
}\
.ace-crunch-dark .ace_comment {\
color: #b08a6b;\
}\
.ace-crunch-dark .ace_xml-pe {\
color: rgb(164, 164, 151);\
}\
.ace-crunch-dark .ace_entity.ace_name.ace_function {\
color: hsl(34, 75%, 60%);\
}\
.ace-crunch-dark .ace_markup.ace_heading {\
color: hsl(193, 77%, 42%);\
}\
.ace-crunch-dark .ace_markup.ace_list {\
color:hsl(314, 54%, 64%);\
}\
.ace-crunch-dark .ace_meta.ace_tag {\
color: hsl(10,75%,69%);\
}\
.ace-crunch-dark .ace_meta.ace_tag-name {\
color: hsl(214, 90%, 66%);\
}\
.ace-crunch-dark .ace_meta.ace_tag.ace_name {\
color: hsl(214, 59%, 35%);\
}\
.ace-crunch-dark .ace_entity {\
color: hsl(310, 50%, 64%);\
}\
.ace-crunch-dark .ace_marker-layer .ace_selection {\
background: hsl(34, 9%, 30%);\
border-left: 1px solid hsl(34, 19%, 45%);\
border-right: 1px solid hsl(34, 19%, 45%);\
}\
.ace-crunch-dark.ace_multiselect .ace_selection.ace_start {\
box-shadow: 0 0 3px 0px white;\
border-radius: 2px;\
}\
.ace-crunch-dark .ace_marker-layer .ace_step {\
background: rgb(252, 255, 0);\
}\
.ace-crunch-dark .ace_marker-layer .ace_stack {\
background: rgb(164, 229, 101);\
}\
.ace-crunch-dark .ace_marker-layer .ace_bracket {\
/*margin: -1px 0 0 -1px;*/\
border-bottom: 1px solid  hsla(200, 50%,75%,1);\
border-radius: 2px;\
box-sizing: content-box;\
background: hsla(200, 50%, 75%,0.05);\
box-shadow: 0px 1px 4px 1px hsla(200, 50%,38%,0.9);\
}\
.ace-crunch-dark .ace_marker-layer .ace_active-line {\
background: rgba(0, 0, 0, 0.1)\
}\
.ace-crunch-dark .ace_gutter-active-line {\
background-color : rgba(0, 0, 0, 0.15);\
}\
.ace-crunch-dark .ace_gutter-layer {\
/*width: 100% !important;*/\
}\
.ace-crunch-dark .ace_marker-layer .ace_selected-word {\
background: hsla(0,0%,45%, 0.3);\
border: 1px solid hsla(27,13%,60%,0.3);\
z-index: 10;\
}\
.ace-crunch-dark .ace_indent-guide {\
margin-right: -1px;\
height: 1.5em;\
display: inline-block;\
}\
.ace-crunch-dark .ace_indent-guide:after {\
border-right: 1px solid hsl(0, 0%, 30%);\
float: right;\
height: 100%;\
content: '';\
position: relative;\
}\
";

var dom = ace_require("../lib/dom");
dom.importCssString(exports.cssText, exports.cssClass);
});