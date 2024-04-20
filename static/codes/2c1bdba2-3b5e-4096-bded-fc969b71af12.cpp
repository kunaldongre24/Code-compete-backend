#include <bits/stdc++.h>
using namespace std;int n,m,x,y,i,p,a;main(){cin>>n>>m;for (i=1; i<=n; i++) {cin>>a;y=(a+m-1) /m;if(y>=p) {x=i; p=y;}}cout<<x;}