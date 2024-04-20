#include <iostream>
#include<algorithm>
using namespace std;
int main()
{
	int n,ans,k; cin>>n>>ans;
	while(--n)  {cin>>k; ans=max(ans,k);}
	cout<<ans;
}