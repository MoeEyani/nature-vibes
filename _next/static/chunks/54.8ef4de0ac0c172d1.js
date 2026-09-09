"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[54],{878:(e,t,n)=>{n.d(t,{l:()=>s});var i=n(8945),r=n(2115),o=n(5339),a=n(5571);let s=r.forwardRef(({threshold:e=15,geometry:t,...n},s)=>{let l=r.useRef(null);r.useImperativeHandle(s,()=>l.current,[]);let c=r.useMemo(()=>[0,0,0,1,0,0],[]),u=r.useRef(null),d=r.useRef(null);return r.useLayoutEffect(()=>{let n=l.current.parent,i=null!=t?t:null==n?void 0:n.geometry;if(!i||u.current===i&&d.current===e)return;u.current=i,d.current=e;let r=new o.TDQ(i,e).attributes.position.array;l.current.geometry.setPositions(r),l.current.geometry.attributes.instanceStart.needsUpdate=!0,l.current.geometry.attributes.instanceEnd.needsUpdate=!0,l.current.computeLineDistances()}),r.createElement(a.N,(0,i.A)({segments:!0,points:c,ref:l,raycast:()=>null},n))})},1868:(e,t,n)=>{n.d(t,{t:()=>u});var i=n(8945),r=n(2115),o=n(9037),a=n(5339),s=n(6762);function l({scale:e=[.8,.05,.05],color:t,rotation:n}){return r.createElement("group",{rotation:n},r.createElement("mesh",{position:[.4,0,0]},r.createElement("boxGeometry",{args:e}),r.createElement("meshBasicMaterial",{color:t,toneMapped:!1})))}function c({onClick:e,font:t,disabled:n,arcStyle:s,label:l,labelColor:c,axisHeadScale:u=1,...d}){let f=(0,o.C)(e=>e.gl),p=r.useMemo(()=>{let e=document.createElement("canvas");e.width=64,e.height=64;let n=e.getContext("2d");return n.beginPath(),n.arc(32,32,16,0,2*Math.PI),n.closePath(),n.fillStyle=s,n.fill(),l&&(n.font=t,n.textAlign="center",n.fillStyle=c,n.fillText(l,32,41)),new a.GOR(e)},[s,l,c,t]),[m,h]=r.useState(!1),v=(l?1:.75)*(m?1.2:1)*u;return r.createElement("sprite",(0,i.A)({scale:v,onPointerOver:n?void 0:e=>{e.stopPropagation(),h(!0)},onPointerOut:n?void 0:e||(e=>{e.stopPropagation(),h(!1)})},d),r.createElement("spriteMaterial",{map:p,"map-anisotropy":f.capabilities.getMaxAnisotropy()||1,alphaTest:.3,opacity:l?1:.75,toneMapped:!1}))}let u=({hideNegativeAxes:e,hideAxisHeads:t,disabled:n,font:o="18px Inter var, Arial, sans-serif",axisColors:a=["#ff2060","#20df80","#2080ff"],axisHeadScale:u=1,axisScale:d,labels:f=["X","Y","Z"],labelColor:p="#000",onClick:m,...h})=>{let[v,y,g]=a,{tweenCamera:x}=(0,s.F)(),w={font:o,disabled:n,labelColor:p,onClick:m,axisHeadScale:u,onPointerDown:n?void 0:e=>{x(e.object.position),e.stopPropagation()}};return r.createElement("group",(0,i.A)({scale:40},h),r.createElement(l,{color:v,rotation:[0,0,0],scale:d}),r.createElement(l,{color:y,rotation:[0,0,Math.PI/2],scale:d}),r.createElement(l,{color:g,rotation:[0,-Math.PI/2,0],scale:d}),!t&&r.createElement(r.Fragment,null,r.createElement(c,(0,i.A)({arcStyle:v,position:[1,0,0],label:f[0]},w)),r.createElement(c,(0,i.A)({arcStyle:y,position:[0,1,0],label:f[1]},w)),r.createElement(c,(0,i.A)({arcStyle:g,position:[0,0,1],label:f[2]},w)),!e&&r.createElement(r.Fragment,null,r.createElement(c,(0,i.A)({arcStyle:v,position:[-1,0,0]},w)),r.createElement(c,(0,i.A)({arcStyle:y,position:[0,-1,0]},w)),r.createElement(c,(0,i.A)({arcStyle:g,position:[0,0,-1]},w)))))}},3279:(e,t,n)=>{n.d(t,{x:()=>c});var i=n(8945),r=n(2115),o=n(5339),a=n(9037);let s=parseInt(o.sPf.replace(/\D+/g,"")),l=function(e,t,n,i){var r;return(r=class extends o.BKk{constructor(i){for(let r in super({vertexShader:t,fragmentShader:n,...i}),e)this.uniforms[r]=new o.nc$(e[r]),Object.defineProperty(this,r,{get(){return this.uniforms[r].value},set(e){this.uniforms[r].value=e}});this.uniforms=o.LlO.clone(this.uniforms)}}).key=o.cj9.generateUUID(),r}({cellSize:.5,sectionSize:1,fadeDistance:100,fadeStrength:1,fadeFrom:1,cellThickness:.5,sectionThickness:1,cellColor:new o.Q1f,sectionColor:new o.Q1f,infiniteGrid:!1,followCamera:!1,worldCamProjPosition:new o.Pq0,worldPlanePosition:new o.Pq0},`
    varying vec3 localPosition;
    varying vec4 worldPosition;

    uniform vec3 worldCamProjPosition;
    uniform vec3 worldPlanePosition;
    uniform float fadeDistance;
    uniform bool infiniteGrid;
    uniform bool followCamera;

    void main() {
      localPosition = position.xzy;
      if (infiniteGrid) localPosition *= 1.0 + fadeDistance;
      
      worldPosition = modelMatrix * vec4(localPosition, 1.0);
      if (followCamera) {
        worldPosition.xyz += (worldCamProjPosition - worldPlanePosition);
        localPosition = (inverse(modelMatrix) * worldPosition).xyz;
      }

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,`
    varying vec3 localPosition;
    varying vec4 worldPosition;

    uniform vec3 worldCamProjPosition;
    uniform float cellSize;
    uniform float sectionSize;
    uniform vec3 cellColor;
    uniform vec3 sectionColor;
    uniform float fadeDistance;
    uniform float fadeStrength;
    uniform float fadeFrom;
    uniform float cellThickness;
    uniform float sectionThickness;

    float getGrid(float size, float thickness) {
      vec2 r = localPosition.xz / size;
      vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
      float line = min(grid.x, grid.y) + 1.0 - thickness;
      return 1.0 - min(line, 1.0);
    }

    void main() {
      float g1 = getGrid(cellSize, cellThickness);
      float g2 = getGrid(sectionSize, sectionThickness);

      vec3 from = worldCamProjPosition*vec3(fadeFrom);
      float dist = distance(from, worldPosition.xyz);
      float d = 1.0 - min(dist / fadeDistance, 1.0);
      vec3 color = mix(cellColor, sectionColor, min(1.0, sectionThickness * g2));

      gl_FragColor = vec4(color, (g1 + g2) * pow(d, fadeStrength));
      gl_FragColor.a = mix(0.75 * gl_FragColor.a, gl_FragColor.a, g2);
      if (gl_FragColor.a <= 0.0) discard;

      #include <tonemapping_fragment>
      #include <${s>=154?"colorspace_fragment":"encodings_fragment"}>
    }
  `),c=r.forwardRef(({args:e,cellColor:t="#000000",sectionColor:n="#2080ff",cellSize:s=.5,sectionSize:c=1,followCamera:u=!1,infiniteGrid:d=!1,fadeDistance:f=100,fadeStrength:p=1,fadeFrom:m=1,cellThickness:h=.5,sectionThickness:v=1,side:y=o.hsX,...g},x)=>{(0,a.e)({GridMaterial:l});let w=r.useRef(null);r.useImperativeHandle(x,()=>w.current,[]);let S=new o.Zcv,b=new o.Pq0(0,1,0),E=new o.Pq0(0,0,0);return(0,a.D)(e=>{S.setFromNormalAndCoplanarPoint(b,E).applyMatrix4(w.current.matrixWorld);let t=w.current.material,n=t.uniforms.worldCamProjPosition,i=t.uniforms.worldPlanePosition;S.projectPoint(e.camera.position,n.value),i.value.set(0,0,0).applyMatrix4(w.current.matrixWorld)}),r.createElement("mesh",(0,i.A)({ref:w,frustumCulled:!1},g),r.createElement("gridMaterial",(0,i.A)({transparent:!0,"extensions-derivatives":!0,side:y},{cellSize:s,sectionSize:c,cellColor:t,sectionColor:n,cellThickness:h,sectionThickness:v},{fadeDistance:f,fadeStrength:p,fadeFrom:m,infiniteGrid:d,followCamera:u})),r.createElement("planeGeometry",{args:e}))})},3646:(e,t,n)=>{let i,r;n.d(t,{E:()=>x});var o=n(8945),a=n(2115),s=n(2669),l=n(5339),c=n(9037);let u=new l.Pq0,d=new l.Pq0,f=new l.Pq0,p=new l.I9Y;function m(e,t,n){let i=u.setFromMatrixPosition(e.matrixWorld);i.project(t);let r=n.width/2,o=n.height/2;return[i.x*r+r,-(i.y*o)+o]}let h=e=>1e-10>Math.abs(e)?0:e;function v(e,t,n=""){let i="matrix3d(";for(let n=0;16!==n;n++)i+=h(t[n]*e.elements[n])+(15!==n?",":")");return n+i}let y=(i=[1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1],e=>v(e,i)),g=(r=e=>[1/e,1/e,1/e,1,-1/e,-1/e,-1/e,-1,1/e,1/e,1/e,1,1,1,1,1],(e,t)=>v(e,r(t),"translate(-50%,-50%)")),x=a.forwardRef(({children:e,eps:t=.001,style:n,className:i,prepend:r,center:v,fullscreen:x,portal:w,distanceFactor:S,sprite:b=!1,transform:E=!1,occlude:P,onOcclude:M,castShadow:A,receiveShadow:_,material:C,geometry:z,zIndexRange:L=[0x1000037,0],calculatePosition:U=m,as:R="div",wrapperClass:T,pointerEvents:D="auto",...O},I)=>{let{gl:B,camera:W,scene:j,size:F,raycaster:H,events:q,viewport:k}=(0,c.C)(),[N]=a.useState(()=>document.createElement(R)),G=a.useRef(null),$=a.useRef(null),Q=a.useRef(0),V=a.useRef([0,0]),Y=a.useRef(null),Z=a.useRef(null),X=(null==w?void 0:w.current)||q.connected||B.domElement.parentNode,J=a.useRef(null),K=a.useRef(!1),ee=a.useMemo(()=>P&&"blending"!==P||Array.isArray(P)&&P.length&&function(e){return e&&"object"==typeof e&&"current"in e}(P[0]),[P]);a.useLayoutEffect(()=>{let e=B.domElement;P&&"blending"===P?(e.style.zIndex=`${Math.floor(L[0]/2)}`,e.style.position="absolute",e.style.pointerEvents="none"):(e.style.zIndex=null,e.style.position=null,e.style.pointerEvents=null)},[P]),a.useLayoutEffect(()=>{if($.current){let e=G.current=s.createRoot(N);if(j.updateMatrixWorld(),E)N.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{let e=U($.current,W,F);N.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${e[0]}px,${e[1]}px,0);transform-origin:0 0;`}return X&&(r?X.prepend(N):X.appendChild(N)),()=>{X&&X.removeChild(N),e.unmount()}}},[X,E]),a.useLayoutEffect(()=>{T&&(N.className=T)},[T]);let et=a.useMemo(()=>E?{position:"absolute",top:0,left:0,width:F.width,height:F.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:v?"translate3d(-50%,-50%,0)":"none",...x&&{top:-F.height/2,left:-F.width/2,width:F.width,height:F.height},...n},[n,v,x,F,E]),en=a.useMemo(()=>({position:"absolute",pointerEvents:D}),[D]);a.useLayoutEffect(()=>{var t,r;K.current=!1,E?null==(t=G.current)||t.render(a.createElement("div",{ref:Y,style:et},a.createElement("div",{ref:Z,style:en},a.createElement("div",{ref:I,className:i,style:n,children:e})))):null==(r=G.current)||r.render(a.createElement("div",{ref:I,style:et,className:i,children:e}))});let ei=a.useRef(!0);(0,c.D)(e=>{if($.current){W.updateMatrixWorld(),$.current.updateWorldMatrix(!0,!1);let e=E?V.current:U($.current,W,F);if(E||Math.abs(Q.current-W.zoom)>t||Math.abs(V.current[0]-e[0])>t||Math.abs(V.current[1]-e[1])>t){let t=function(e,t){let n=u.setFromMatrixPosition(e.matrixWorld),i=d.setFromMatrixPosition(t.matrixWorld),r=n.sub(i),o=t.getWorldDirection(f);return r.angleTo(o)>Math.PI/2}($.current,W),n=!1;ee&&(Array.isArray(P)?n=P.map(e=>e.current):"blending"!==P&&(n=[j]));let i=ei.current;n?ei.current=function(e,t,n,i){let r=u.setFromMatrixPosition(e.matrixWorld),o=r.clone();o.project(t),p.set(o.x,o.y),n.setFromCamera(p,t);let a=n.intersectObjects(i,!0);if(a.length){let e=a[0].distance;return r.distanceTo(n.ray.origin)<e}return!0}($.current,W,H,n)&&!t:ei.current=!t,i!==ei.current&&(M?M(!ei.current):N.style.display=ei.current?"block":"none");let r=Math.floor(L[0]/2),o=P?ee?[L[0],r]:[r-1,0]:L;if(N.style.zIndex=`${function(e,t,n){if(t instanceof l.ubm||t instanceof l.qUd){let i=u.setFromMatrixPosition(e.matrixWorld),r=d.setFromMatrixPosition(t.matrixWorld),o=i.distanceTo(r),a=(n[1]-n[0])/(t.far-t.near),s=n[1]-a*t.far;return Math.round(a*o+s)}}($.current,W,o)}`,E){let[e,t]=[F.width/2,F.height/2],n=W.projectionMatrix.elements[5]*t,{isOrthographicCamera:i,top:r,left:o,bottom:a,right:s}=W,l=y(W.matrixWorldInverse),c=i?`scale(${n})translate(${h(-(s+o)/2)}px,${h((r+a)/2)}px)`:`translateZ(${n}px)`,u=$.current.matrixWorld;b&&((u=W.matrixWorldInverse.clone().transpose().copyPosition(u).scale($.current.scale)).elements[3]=u.elements[7]=u.elements[11]=0,u.elements[15]=1),N.style.width=F.width+"px",N.style.height=F.height+"px",N.style.perspective=i?"":`${n}px`,Y.current&&Z.current&&(Y.current.style.transform=`${c}${l}translate(${e}px,${t}px)`,Z.current.style.transform=g(u,1/((S||10)/400)))}else{let t=void 0===S?1:function(e,t){if(t instanceof l.qUd)return t.zoom;if(!(t instanceof l.ubm))return 1;{let n=u.setFromMatrixPosition(e.matrixWorld),i=d.setFromMatrixPosition(t.matrixWorld);return 1/(2*Math.tan(t.fov*Math.PI/180/2)*n.distanceTo(i))}}($.current,W)*S;N.style.transform=`translate3d(${e[0]}px,${e[1]}px,0) scale(${t})`}V.current=e,Q.current=W.zoom}}if(!ee&&J.current&&!K.current)if(E){if(Y.current){let e=Y.current.children[0];if(null!=e&&e.clientWidth&&null!=e&&e.clientHeight){let{isOrthographicCamera:t}=W;if(t||z)O.scale&&(Array.isArray(O.scale)?O.scale instanceof l.Pq0?J.current.scale.copy(O.scale.clone().divideScalar(1)):J.current.scale.set(1/O.scale[0],1/O.scale[1],1/O.scale[2]):J.current.scale.setScalar(1/O.scale));else{let t=(S||10)/400,n=e.clientWidth*t,i=e.clientHeight*t;J.current.scale.set(n,i,1)}K.current=!0}}}else{let t=N.children[0];if(null!=t&&t.clientWidth&&null!=t&&t.clientHeight){let e=1/k.factor,n=t.clientWidth*e,i=t.clientHeight*e;J.current.scale.set(n,i,1),K.current=!0}J.current.lookAt(e.camera.position)}});let er=a.useMemo(()=>({vertexShader:E?void 0:`
          /*
            This shader is from the THREE's SpriteMaterial.
            We need to turn the backing plane into a Sprite
            (make it always face the camera) if "transfrom"
            is false.
          */
          #include <common>

          void main() {
            vec2 center = vec2(0., 1.);
            float rotation = 0.0;

            // This is somewhat arbitrary, but it seems to work well
            // Need to figure out how to derive this dynamically if it even matters
            float size = 0.03;

            vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
            vec2 scale;
            scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
            scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );

            bool isPerspective = isPerspectiveMatrix( projectionMatrix );
            if ( isPerspective ) scale *= - mvPosition.z;

            vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale * size;
            vec2 rotatedPosition;
            rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
            rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
            mvPosition.xy += rotatedPosition;

            gl_Position = projectionMatrix * mvPosition;
          }
      `,fragmentShader:`
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
      `}),[E]);return a.createElement("group",(0,o.A)({},O,{ref:$}),P&&!ee&&a.createElement("mesh",{castShadow:A,receiveShadow:_,ref:J},z||a.createElement("planeGeometry",null),C||a.createElement("shaderMaterial",{side:l.$EB,vertexShader:er.vertexShader,fragmentShader:er.fragmentShader})))})},5571:(e,t,n)=>{let i,r;n.d(t,{N:()=>T});var o=n(8945),a=n(2115),s=n(5339),l=n(9037);let c=new s.NRn,u=new s.Pq0;class d extends s.CmU{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new s.qtW([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new s.qtW([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new s.LuO(t,6,1);return this.setAttribute("instanceStart",new s.eHs(n,3,0)),this.setAttribute("instanceEnd",new s.eHs(n,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let n;e instanceof Float32Array?n=e:Array.isArray(e)&&(n=new Float32Array(e));let i=new s.LuO(n,2*t,1);return this.setAttribute("instanceColorStart",new s.eHs(i,t,0)),this.setAttribute("instanceColorEnd",new s.eHs(i,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new s.XJ7(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new s.NRn);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),c.setFromBufferAttribute(t),this.boundingBox.union(c))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new s.iyt),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let i=0;for(let r=0,o=e.count;r<o;r++)u.fromBufferAttribute(e,r),i=Math.max(i,n.distanceToSquared(u)),u.fromBufferAttribute(t,r),i=Math.max(i,n.distanceToSquared(u));this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}var f=n(7548);let p=parseInt(s.sPf.replace(/\D+/g,""));class m extends s.BKk{constructor(e){super({type:"LineMaterial",uniforms:s.LlO.clone(s.LlO.merge([f.UniformsLib.common,f.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new s.I9Y(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${p>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(e){!!e!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(e){!!e!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===e?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}let h=p>=125?"uv1":"uv2",v=new s.IUQ,y=new s.Pq0,g=new s.Pq0,x=new s.IUQ,w=new s.IUQ,S=new s.IUQ,b=new s.Pq0,E=new s.kn4,P=new s.cZY,M=new s.Pq0,A=new s.NRn,_=new s.iyt,C=new s.IUQ;function z(e,t,n){return C.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),C.multiplyScalar(1/C.w),C.x=r/n.width,C.y=r/n.height,C.applyMatrix4(e.projectionMatrixInverse),C.multiplyScalar(1/C.w),Math.abs(Math.max(C.x,C.y))}class L extends s.eaF{constructor(e=new d,t=new m({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,i=new Float32Array(2*t.count);for(let e=0,r=0,o=t.count;e<o;e++,r+=2)y.fromBufferAttribute(t,e),g.fromBufferAttribute(n,e),i[r]=0===r?0:i[r-1],i[r+1]=i[r]+y.distanceTo(g);let r=new s.LuO(i,2,1);return e.setAttribute("instanceDistanceStart",new s.eHs(r,1,0)),e.setAttribute("instanceDistanceEnd",new s.eHs(r,1,1)),this}raycast(e,t){let n,o,a=this.material.worldUnits,l=e.camera;null!==l||a||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let c=void 0!==e.params.Line2&&e.params.Line2.threshold||0;i=e.ray;let u=this.matrixWorld,d=this.geometry,f=this.material;if(r=f.linewidth+c,null===d.boundingSphere&&d.computeBoundingSphere(),_.copy(d.boundingSphere).applyMatrix4(u),a)n=.5*r;else{let e=Math.max(l.near,_.distanceToPoint(i.origin));n=z(l,e,f.resolution)}if(_.radius+=n,!1!==i.intersectsSphere(_)){if(null===d.boundingBox&&d.computeBoundingBox(),A.copy(d.boundingBox).applyMatrix4(u),a)o=.5*r;else{let e=Math.max(l.near,A.distanceToPoint(i.origin));o=z(l,e,f.resolution)}A.expandByScalar(o),!1!==i.intersectsBox(A)&&(a?function(e,t){let n=e.matrixWorld,o=e.geometry,a=o.attributes.instanceStart,l=o.attributes.instanceEnd,c=Math.min(o.instanceCount,a.count);for(let o=0;o<c;o++){P.start.fromBufferAttribute(a,o),P.end.fromBufferAttribute(l,o),P.applyMatrix4(n);let c=new s.Pq0,u=new s.Pq0;i.distanceSqToSegment(P.start,P.end,u,c),u.distanceTo(c)<.5*r&&t.push({point:u,pointOnLine:c,distance:i.origin.distanceTo(u),object:e,face:null,faceIndex:o,uv:null,[h]:null})}}(this,t):function(e,t,n){let o=t.projectionMatrix,a=e.material.resolution,l=e.matrixWorld,c=e.geometry,u=c.attributes.instanceStart,d=c.attributes.instanceEnd,f=Math.min(c.instanceCount,u.count),p=-t.near;i.at(1,S),S.w=1,S.applyMatrix4(t.matrixWorldInverse),S.applyMatrix4(o),S.multiplyScalar(1/S.w),S.x*=a.x/2,S.y*=a.y/2,S.z=0,b.copy(S),E.multiplyMatrices(t.matrixWorldInverse,l);for(let t=0;t<f;t++){if(x.fromBufferAttribute(u,t),w.fromBufferAttribute(d,t),x.w=1,w.w=1,x.applyMatrix4(E),w.applyMatrix4(E),x.z>p&&w.z>p)continue;if(x.z>p){let e=x.z-w.z,t=(x.z-p)/e;x.lerp(w,t)}else if(w.z>p){let e=w.z-x.z,t=(w.z-p)/e;w.lerp(x,t)}x.applyMatrix4(o),w.applyMatrix4(o),x.multiplyScalar(1/x.w),w.multiplyScalar(1/w.w),x.x*=a.x/2,x.y*=a.y/2,w.x*=a.x/2,w.y*=a.y/2,P.start.copy(x),P.start.z=0,P.end.copy(w),P.end.z=0;let c=P.closestPointToPointParameter(b,!0);P.at(c,M);let f=s.cj9.lerp(x.z,w.z,c),m=f>=-1&&f<=1,v=b.distanceTo(M)<.5*r;if(m&&v){P.start.fromBufferAttribute(u,t),P.end.fromBufferAttribute(d,t),P.start.applyMatrix4(l),P.end.applyMatrix4(l);let r=new s.Pq0,o=new s.Pq0;i.distanceSqToSegment(P.start,P.end,o,r),n.push({point:o,pointOnLine:r,distance:i.origin.distanceTo(o),object:e,face:null,faceIndex:t,uv:null,[h]:null})}}}(this,l,t))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(v),this.material.uniforms.resolution.value.set(v.z,v.w))}}class U extends d{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){let t=e.length-3,n=new Float32Array(2*t);for(let i=0;i<t;i+=3)n[2*i]=e[i],n[2*i+1]=e[i+1],n[2*i+2]=e[i+2],n[2*i+3]=e[i+3],n[2*i+4]=e[i+4],n[2*i+5]=e[i+5];return super.setPositions(n),this}setColors(e,t=3){let n=e.length-t,i=new Float32Array(2*n);if(3===t)for(let r=0;r<n;r+=t)i[2*r]=e[r],i[2*r+1]=e[r+1],i[2*r+2]=e[r+2],i[2*r+3]=e[r+3],i[2*r+4]=e[r+4],i[2*r+5]=e[r+5];else for(let r=0;r<n;r+=t)i[2*r]=e[r],i[2*r+1]=e[r+1],i[2*r+2]=e[r+2],i[2*r+3]=e[r+3],i[2*r+4]=e[r+4],i[2*r+5]=e[r+5],i[2*r+6]=e[r+6],i[2*r+7]=e[r+7];return super.setColors(i,t),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class R extends L{constructor(e=new U,t=new m({color:0xffffff*Math.random()})){super(e,t),this.isLine2=!0,this.type="Line2"}}let T=a.forwardRef(function({points:e,color:t=0xffffff,vertexColors:n,linewidth:i,lineWidth:r,segments:c,dashed:u,...f},p){var h,v;let y=(0,l.C)(e=>e.size),g=a.useMemo(()=>c?new L:new R,[c]),[x]=a.useState(()=>new m),w=(null==n||null==(h=n[0])?void 0:h.length)===4?4:3,S=a.useMemo(()=>{let i=c?new d:new U,r=e.map(e=>{let t=Array.isArray(e);return e instanceof s.Pq0||e instanceof s.IUQ?[e.x,e.y,e.z]:e instanceof s.I9Y?[e.x,e.y,0]:t&&3===e.length?[e[0],e[1],e[2]]:t&&2===e.length?[e[0],e[1],0]:e});if(i.setPositions(r.flat()),n){t=0xffffff;let e=n.map(e=>e instanceof s.Q1f?e.toArray():e);i.setColors(e.flat(),w)}return i},[e,c,n,w]);return a.useLayoutEffect(()=>{g.computeLineDistances()},[e,g]),a.useLayoutEffect(()=>{u?x.defines.USE_DASH="":delete x.defines.USE_DASH,x.needsUpdate=!0},[u,x]),a.useEffect(()=>()=>{S.dispose(),x.dispose()},[S]),a.createElement("primitive",(0,o.A)({object:g,ref:p},f),a.createElement("primitive",{object:S,attach:"geometry"}),a.createElement("primitive",(0,o.A)({object:x,attach:"material",color:t,vertexColors:!!n,resolution:[y.width,y.height],linewidth:null!=(v=null!=i?i:r)?v:1,dashed:u,transparent:4===w},f)))})},6762:(e,t,n)=>{n.d(t,{z:()=>x,F:()=>d});var i=n(2115),r=n(9037),o=n(5339),a=n(8945);let s=i.forwardRef(({envMap:e,resolution:t=256,frames:n=1/0,children:s,makeDefault:l,...c},u)=>{let d=(0,r.C)(({set:e})=>e),f=(0,r.C)(({camera:e})=>e),p=(0,r.C)(({size:e})=>e),m=i.useRef(null);i.useImperativeHandle(u,()=>m.current,[]);let h=i.useRef(null),v=function(e,t,n){let a=(0,r.C)(e=>e.size),s=(0,r.C)(e=>e.viewport),l="number"==typeof e?e:a.width*s.dpr,c=a.height*s.dpr,u=("number"==typeof e?void 0:e)||{},{samples:d=0,depth:f,...p}=u,m=null!=f?f:u.depthBuffer,h=i.useMemo(()=>{let e=new o.nWS(l,c,{minFilter:o.k6q,magFilter:o.k6q,type:o.ix0,...p});return m&&(e.depthTexture=new o.VCu(l,c,o.RQf)),e.samples=d,e},[]);return i.useLayoutEffect(()=>{h.setSize(l,c),d&&(h.samples=d)},[d,h,l,c]),i.useEffect(()=>()=>h.dispose(),[]),h}(t);i.useLayoutEffect(()=>{c.manual||m.current.updateProjectionMatrix()},[p,c]),i.useLayoutEffect(()=>{m.current.updateProjectionMatrix()}),i.useLayoutEffect(()=>{if(l)return d(()=>({camera:m.current})),()=>d(()=>({camera:f}))},[m,l,d]);let y=0,g=null,x="function"==typeof s;return(0,r.D)(t=>{x&&(n===1/0||y<n)&&(h.current.visible=!1,t.gl.setRenderTarget(v),g=t.scene.background,e&&(t.scene.background=e),t.gl.render(t.scene,m.current),t.scene.background=g,t.gl.setRenderTarget(null),h.current.visible=!0,y++)}),i.createElement(i.Fragment,null,i.createElement("orthographicCamera",(0,a.A)({left:-(p.width/2),right:p.width/2,top:p.height/2,bottom:-(p.height/2),ref:m},c),!x&&s),i.createElement("group",{ref:h},x&&s(v.texture)))});function l({defaultScene:e,defaultCamera:t,renderPriority:n=1}){let o,{gl:a,scene:s,camera:l}=(0,r.C)();return(0,r.D)(()=>{o=a.autoClear,1===n&&(a.autoClear=!0,a.render(e,t)),a.autoClear=!1,a.clearDepth(),a.render(s,l),a.autoClear=o},n),i.createElement("group",{onPointerOver:()=>null})}function c({children:e,renderPriority:t=1}){let{scene:n,camera:a}=(0,r.C)(),[s]=i.useState(()=>new o.Z58);return i.createElement(i.Fragment,null,(0,r.o)(i.createElement(i.Fragment,null,e,i.createElement(l,{defaultScene:n,defaultCamera:a,renderPriority:t})),s,{events:{priority:t+1}}))}let u=i.createContext({}),d=()=>i.useContext(u),f=2*Math.PI,p=new o.B69,m=new o.kn4,[h,v]=[new o.PTz,new o.PTz],y=new o.Pq0,g=new o.Pq0,x=({alignment:e="bottom-right",margin:t=[80,80],renderPriority:n=1,onUpdate:a,onTarget:l,children:d})=>{let x=(0,r.C)(e=>e.size),w=(0,r.C)(e=>e.camera),S=(0,r.C)(e=>e.controls),b=(0,r.C)(e=>e.invalidate),E=i.useRef(null),P=i.useRef(null),M=i.useRef(!1),A=i.useRef(0),_=i.useRef(new o.Pq0(0,0,0)),C=i.useRef(new o.Pq0(0,0,0));i.useEffect(()=>{C.current.copy(w.up),p.up.copy(w.up)},[w]);let z=i.useCallback(e=>{M.current=!0,(S||l)&&(_.current=(null==l?void 0:l())||("getTarget"in S?S.getTarget(_.current):null==S?void 0:S.target)),A.current=w.position.distanceTo(y),h.copy(w.quaternion),g.copy(e).multiplyScalar(A.current).add(y),p.lookAt(g),v.copy(p.quaternion),b()},[S,w,l,b]);(0,r.D)((e,t)=>{if(P.current&&E.current){var n;M.current&&(.01>h.angleTo(v)?(M.current=!1,"minPolarAngle"in S&&w.up.copy(C.current)):(h.rotateTowards(v,t*f),w.position.set(0,0,1).applyQuaternion(h).multiplyScalar(A.current).add(_.current),w.up.set(0,1,0).applyQuaternion(h).normalize(),w.quaternion.copy(h),"getTarget"in S&&S.setPosition(w.position.x,w.position.y,w.position.z),a?a():S&&S.update(t),b())),m.copy(w.matrix).invert(),null==(n=E.current)||n.quaternion.setFromRotationMatrix(m)}});let L=i.useMemo(()=>({tweenCamera:z}),[z]),[U,R]=t,T=e.endsWith("-center")?0:e.endsWith("-left")?-x.width/2+U:x.width/2-U,D=e.startsWith("center-")?0:e.startsWith("top-")?x.height/2-R:-x.height/2+R;return i.createElement(c,{renderPriority:n},i.createElement(u.Provider,{value:L},i.createElement(s,{makeDefault:!0,ref:P,position:[0,0,200]}),i.createElement("group",{ref:E,position:[T,D,0]},d)))}}}]);