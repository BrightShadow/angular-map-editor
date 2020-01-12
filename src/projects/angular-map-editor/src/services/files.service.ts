import {Injectable} from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class FilesService {
    public saveJsonFile(filename: string, object: any): void {
        const content = JSON.stringify(object, undefined, 4);
        const blob = new Blob([content], { type: 'application/octet-stream' });
        const data = (<any>window.URL).createObjectURL(blob);
        const a = document.createElement('a') as HTMLAnchorElement;
        document.body.appendChild(a);
        a.setAttribute('style', 'display: none');
        a.href = data;
        a.download = filename;
        a.click();
        a.remove(); // remove the element
    }

    public uploadJsonFile(): Promise<string> {
        return new Promise((resolve, reject) => {

            const fileInput = document.createElement('input') as HTMLInputElement;
            document.body.appendChild(fileInput);
            fileInput.setAttribute('style', 'position: absolute; left: -10000px'); // hide
            fileInput.setAttribute('type', 'file');
            fileInput.setAttribute('accept', '.json,.txt');
            fileInput.addEventListener('change', (event) => {
                if (fileInput.files.length > 0) {
                    const f = <any>fileInput.files[0];
                    (<Promise<any>>f.text())
                        .then(fileText => {
                            fileInput.remove();
                            resolve(fileText);
                        })
                        .catch((e) => {
                            console.log(e);
                            fileInput.remove();
                            reject();
                        });

                } else {
                    reject();
                    fileInput.remove();
                }
            });
            fileInput.click();

        });
    }
}
