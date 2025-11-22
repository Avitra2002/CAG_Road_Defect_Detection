# Local Revit-to-Postgres Integration
## Steps Taken

1. Visual Studio Class Library (.NET Framework 4.8)

2. Create New Project: RevitPostgresAddin

3. (Right-Click) References → Add References
    - Browse for `C:\Program Files\Autodesk\Revit 2025\`
    - select `RevitAPI.dll, RevitAPIUI.dll`
    - Click OK (Revit API loaded)

4. Install Npsql
    - (Right Click) Manage NuGet Packages..
    - Search for `Npgsql`
    - Install
5. Add Class → name: `ReadPostgresCommand.cs`

6. Press Build → Build Solution
    - Adds `"C:\Users\tskwi\source\repos\RevitPostgresAddin\RevitPostgresAddin\bin\Debug\RevitPostgresAddin.dll”`

7. Create Manifest file
    1. Window key → type `%APPDATA%\Autodesk\Revit\Addins\2025\`
    2. Right Click → New → Text Document
        
        ```sql
        <?xml version="1.0" encoding="utf-8" standalone="no"?>
        <RevitAddIns>
          <AddIn Type="Command">
            <Name>RevitPostgresAddin</Name>
            <Assembly>C:\Users\tskwi\source\repos\RevitPostgresAddin\RevitPostgresAddin\bin\Debug\RevitPostgresAddin.dll</Assembly>
            <AddInId>00000000-0000-0000-0000-000000000001</AddInId>
            <FullClassName>RevitPostgresAddin.ReadPostgresCommand</FullClassName>
            <VendorId>AP</VendorId>
            <VendorDescription>PostGIS Integration</VendorDescription>
            <Text>Import Markers from Postgres</Text>
          </AddIn>
        </RevitAddIns>
        ```
        
    3. rename to `RevitPostgres.addin` [MAKE SURE ITS .addin and not .txt]

    
8. Reopen Revit → Go to Add-Ins Tab → External Tools → Choose ‘Import Markers from Postgres’

## Further Steps
1. Sync BIM model to Autodesk Platform Services (APS)
    - Host the published model in APS Model Derivative / BIM360 Docs
    - Enable cloud rendering of markers
    - Allow web embedding of the 3D viewer into our dashboard

2. Full cloud automation
    - Trigger APS model updates when new defects are detected
    - Automatically push markers into the cloud model (via APS Design Automation for Revit)
    - Avoid the need for local Revit instance entirely

3. Road geometry tagging
    CAG’s BIM model currently lacks geo-referenced survey points.We will:
    - Import survey coordinates
    - Tag road segment polylines with real-world GPS
    - Re-align the BIM coordinate system
    - Ensure defects land precisely on road surfaces
    This fixes the biggest limitation discovered during the POC.

4. Advanced 3D visualisations
    Future improvements may include:
    - 3D severity heatmaps
    - Time-based visualisation of worsening defects
    - Filtering markers by severity, status, or date
    - Embedding violation images directly in BIM view