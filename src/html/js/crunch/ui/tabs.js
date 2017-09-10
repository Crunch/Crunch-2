define([
		'lib/lodash'
		, 'crunch/ui/baseView'
		, 'text!template/tabs.html'
		, 'Ractive'
		, 'crunch/utils'
		, 'crunch/ui/messageView'
		, 'lib/Sortable'
		, 'js!lib/iscroll-probe-MOD' ], function(_, base, tabs, Ractive, Utils, Messages, Sortable) {
	

	var Tabs = {
		ractive: null
		, mains: []
		, subs: []
		, subScrollX: {}
		, create: function(Crunch) {

			if(Tabs.ractive) {
				Tabs.ractive.update();
				// setTimeout(function () {
			 //        Tabs.iscroll.refresh();
			 //    }, 0);
				return;
			}
			var silent = false;

			function refreshTabs(sel, coll, scroller) {
				if(sel !== false) {
					var els = ractive.findAll(sel, true);
					//if(els.length !== coll.length) {
					coll.splice(0);

					els.forEach(function(val, idx) {
						var $this = $(val);
						coll.push($this);
					});
					//}
				}

				return updateTabs(coll, scroller);
			}
			function refreshAll() {
				//console.log('Updating tabs...');
				if(!Crunch.Session.files.active()) return;
				if(!Tabs.main_scroller) return;

				var scrollX = Tabs.subScrollX[Crunch.Session.files.active().root.key];
				if(scrollX && scrollX !== 0) {
					Tabs.sub_scroller.scrollTo(scrollX, 0, 0);
				}
				Tabs.main_scroller.refresh();
				Tabs.sub_scroller.refresh();

				refreshTabs('.t', Tabs.mains, Tabs.main_scroller);
				refreshTabs('.subs > .tab-out', Tabs.subs, Tabs.sub_scroller);
			}
			var $el = this.$el = $('#tabs');
			$el.find('.mains, .subs').on('hover', '.pathtip', function() {
				Messages.add({
					type: 'temp'
					, message: $(this).data('tooltip')
				});
			});
			// $el.on('hover', '.tooltip', function() {
			// 	$(this).tooltipster({
			// 		position: 'bottom-right'
			// 		, speed: 500
			// 		, delay: 2000
			// 		, trigger: 'custom'
			// 		, animation: 'fall'
			// 		, onlyOne: true
			// 		, offsetY: -10
			// 		, offsetX: 2
			// 	});
			// 	$(this).tooltipster('show');
			// }, function() {
			// 	if($(this).hasClass('tooltipstered'))
			// 		$(this).tooltipster('hide');
			// });
			var data = Crunch.Session.projects.active();
			var ractive = new Ractive({
				el: $el[0]
				, template: tabs
				, data: { 
					top: data
					, getTitle: function(str) {
						return str.search(/[\/\\]/) > -1 ? str : '';
					}
				}
				, oninit: function() {
					var activeFile = Crunch.Session.files.active();
					//console.log(this.get('top'));
					if(activeFile && activeFile.flipped) {
						$el.addClass('sub-open');
						this.fire('isFlipped');
					}
				}
				, onupdate: function() {
					setTimeout(function () {
						//console.log(ractive.get('top.activeTabIndex'));
						Tabs.refreshAll();
				    }, 0);
				}
				, onrender: function() {
					refreshAll();
					var b = new Sortable($el.find('.mains')[0], {
						group: "tabs"
						, draggable: '.tab-out'
						, filter: '.close'
						, scroll: false
						, animation: 150
						, onUpdate: function(evt) {
							Crunch.Session.files.move(evt.oldIndex, evt.newIndex);
							Tabs.ractive.update();
							// refreshAll();
						}
					});
					b = new Sortable($el.find('.subs')[0], {
						group: "subtabs"
						, draggable: '.tab-out'
						, filter: '.close'
						, scroll: false
						, animation: 150
						, onUpdate: function(evt) {
							Crunch.Session.files.move(evt.oldIndex+1, evt.newIndex+1, true);
							Tabs.ractive.update();
							// refreshAll();
						}
					});
				}

			});

			

			var $selection = $('<button class="btn primary"><b class="crunch"></b><b class="crunch overlay"></b>Set Output...</button>');
			$selection.on('click', function() {
				Tabs.ractive.fire('selectOutput', Crunch.Session.files.active());
				//console.log(Tabs.activeContext);
			});
			// Close all tooltips if not in a tooltip
			$(document).on('click', function(e) {
				var $within = $(e.target).closest('.tooltipster-base', '.tooltipstered');
				if($within.length === 0) {
					$('.tooltipstered').data('shown', false).tooltipster('hide');
				}
			});

			ractive.on({
				select: function(event) {
					if(event.index.i === ractive.get('top.activeTabIndex')) {
						return false;
					}
					else {
						if(ractive.get(event.keypath + '.flipped')) {
							$el.addClass('sub-open');
						}
						else {
							$el.removeClass('sub-open');
						}
						ractive.set('top.activeTabIndex', event.index.i );
					
						ractive.fire('selectMain', event );
						
					}
				}
				, selectSub: function(event) {
					ractive.set("top.files." + event.index.i + ".activeIndex", event.index.j);
				}
				, flipup: function(event) {
					if(ractive.get('top.activeTabIndex') == event.index.i) {
						if(event.context.crunchable) {
							ractive.set(event.keypath + ".flipped", true);
							$el.addClass('sub-open');
							//refreshAll();
						}
						else {
							var $node = $(event.node);
							if(!$node.hasClass('tooltipstered')) {

								$node.tooltipster({
									position: 'bottom-right'
									, speed: 150
									, trigger: 'custom'
									, animation: 'fall'
									, interactive: true
									, onlyOne: true
									, offsetY: -10
									, offsetX: 2
									, content: $selection
								});
							}
							
							if(!$node.data('shown')) {
								$node.tooltipster('show');
								$node.data('shown', true);
							}
							else {
								$node.tooltipster('hide');
								$node.data('shown', false);
							}

						}
					}
					
				}
				, flipdown: function(event) {
					ractive.set(event.keypath + ".flipped", false);
					$el.removeClass('sub-open');
				}
			});
			ractive.observe( 'top.files.* top.files.*.collection.*', function ( newValue, oldValue, keypath ) {
				//console.log(newValue, oldValue, keypath);
			}, {init: false});

			ractive.observe( 'top.activeTabIndex', function ( newValue, oldValue, keypath ) {
			  ractive.fire('updateIndex', newValue );
			  Tabs.activeContext = newValue;
			  pollScroller();
			  var poll = setInterval(function() {
			  	var $newEl = $('.mains .tab-out').eq(newValue); 

			  	if($newEl.length === 0)
			  		return;
			  	
			  	clearInterval(poll);

			  	var offset = $newEl.data('offset');
			  	
			  	if(offset) {
			  		Tabs.main_scroller.scrollBy(offset, 0, 150);
			  	}
			  },100);

			  setTimeout(function() {
			  	clearInterval(poll);
			  },2000);
			  
			});

			ractive.observe( 'top.files.*.activeIndex', function ( newValue, oldValue, keypath ) {
			  ractive.fire('updateSubIndex', newValue );
			  

			  var poll = setInterval(function() {
			  	var $newEl = $('.subs .tab-out').eq(newValue-1); // First index is in the main bar

			  	if($newEl.length === 0)
			  		return;
			  	
			  	clearInterval(poll);

			  	var offset = $newEl.data('offset');
			  	
			  	if(offset) {
			  		Tabs.sub_scroller.scrollBy(offset, 0, 150);
			  	}
			  },100);

			  setTimeout(function() {
			  	clearInterval(poll);
			  },2000);

			});

			Tabs.ractive = ractive;
 			
 			window.addEventListener( 'resize', function() {
 				Tabs.main_scroller.refresh();
 				Tabs.sub_scroller.refresh();
 				updateTabs(Tabs.mains, Tabs.main_scroller);
 				updateTabs(Tabs.subs, Tabs.sub_scroller);
 				// refreshTabs(false, Tabs.mains, Tabs.main_scroller);
 				// refreshTabs(false, Tabs.subs, Tabs.sub_scroller);
			});

 			var iscrollOptions = {
				bounce: false
				, scrollX: true
				, scrollY: false
				, mouseWheel: true
				, freeScroll: true
				, probeType: 3
				, disableMouse: true
    			, disablePointer: true
    			, disableTouch: true
			};

			Tabs.main_scroller = new IScroll('.mains-outer', iscrollOptions);
			Tabs.sub_scroller = new IScroll('.subs-outer', iscrollOptions);

			function updateMains() {
				//refreshTabs('.t', Tabs.mains, Tabs.main_scroller);
				updateTabs(Tabs.mains, Tabs.main_scroller);
			}
			function updateSubs() {
				//refreshTabs('.subs > .tab-out', Tabs.subs, Tabs.sub_scroller);
				updateTabs(Tabs.subs, Tabs.sub_scroller);
			}
			Tabs.main_scroller.on('scroll', updateMains);
			Tabs.main_scroller.on('scrollEnd', updateMains);
			Tabs.sub_scroller.on('scroll', updateSubs);
			Tabs.sub_scroller.on('scrollEnd', function() {
				Tabs.subScrollX[Crunch.Session.files.active().root.key] =  Tabs.sub_scroller.x;
				updateSubs();
			});
			

			function getOffsetX(el) {
			    var results = el.css('transform').match(/matrix(?:(3d)\(-{0,1}\d+(?:, -{0,1}\d+)*(?:, (-{0,1}\d+))(?:, (-{0,1}\d+))(?:, (-{0,1}\d+)), -{0,1}\d+\)|\(-{0,1}\d+(?:, -{0,1}\d+)*(?:, (-{0,1}\d+))(?:, (-{0,1}\d+))\))/)

			    if(!results) return 0;
			    if(results[1] == '3d') return results.slice(2,5)[0];

			    results.push(0);
			    return results.slice(5, 8)[0];
			}

			function updateTabs(coll, scroller) {
				if(silent || !coll) return;

				var dx, dy;
				
				var activeTabX = 0;

				coll.forEach(function(val, idx) {

					var dataOffset = parseInt(getOffsetX(val));
					
					var offset = val.position().left - dataOffset - scroller.x;
					// TODO: I should rename dx / dy, it's really distance from left / right (both on X axis)
					dx = (offset - (idx * 6) + scroller.x)-3;
					dy = 3-(scroller.wrapperWidth - ((coll.length - idx - 1)*6) - (offset + val.width())- scroller.x);

					// I want an exponential decay here, but couldn't figure it out after about 8 hours.
					// Math is hard.
					var offsetX = 0;
					if(dx <= 0) {
						offsetX = Math.round(-dx);
						val.data('offset', offsetX);
						val.css({
							transform: 'translate3d(' + offsetX + 'px,0,0)'
							, zIndex: ''
						});
					}
					else if(dy >= 0) {
						offsetX = Math.round(-dy);
						val.data('offset', offsetX);
						val.css({
							transform: 'translate3d(' + offsetX + 'px,0,0)'
							, zIndex: coll.length - idx
						});
					}
					else {
						val.data('offset', 0);
						val.css({
							transform: 'translate3d(0,0,0)'
							, zIndex: coll.length
						});
					}
					if(val.hasClass('active')) {
						activeTabX = offsetX;
					}

				});
				return activeTabX;
			}

			_.each(Tabs._eventQueue, function(val, idx) {
				ractive.on(val);
			});
		
			Tabs.refreshAll = refreshAll;

			var $mains = $el.find('.mains');
			var $subs = $el.find('.subs');
			var time = 0;

			function pollScroller() {
				function logWrapper(prop) {
					console.log(prop, Tabs.main_scroller[prop]);
				}
				var clearPoller;
				var poller = setInterval(function() {
					if(Tabs.main_scroller.scrollerWidth !== $mains.outerWidth()
						|| Tabs.sub_scroller.scrollerWidth !== $subs.outerWidth()) {
						
						time+= 100;
						//console.log('Refreshing tabs...', time);
						
						Tabs.refreshAll();
					}
					else {
						// Wait a second before terminating poller
						if(!clearPoller) {
							setTimeout(function() {
								clearInterval(poller);
							}, 1000);
						}
					}
				}, 100);
			}
			// for (prop in Tabs.main_scroller) {
			// 	console.log(prop, Tabs.main_scroller[prop]);
			// }
			
			//refreshAll();
			pollScroller();



			// Scrolling left
			// - Left-most tab "sticks" to left position (think sticky headers)
			// - next left-most tab approaches a two- pixel overlap on the exponential of the
			//   difference of scroll movement.
			//   That is: it will speed towards the left edge overlap (2px), then slow down
			// - Formula: Element-b left edge X position to Element-a left edge X position + 2px
			

		}
		, update: function(force) {
			if(!this.ractive) {
				this.create(global.Crunch);
			}
			else {
				if(force) {
					this.ractive.set('top', global.Crunch.Session.projects.active());
				}
				else {
					this.ractive.update();
				}
			}
		}
	}

	return _.extend(Tabs, base());
});