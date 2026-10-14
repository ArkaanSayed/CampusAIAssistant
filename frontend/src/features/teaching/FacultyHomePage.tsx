// Workshop starter: faculty and student dashboard code is commented out. The admin dashboard stays active.
// import { useEffect, useState, type FormEvent } from 'react';
// import { currentCalendar, listCourseDocuments, listTeachingCourses, uploadCourseDocument, type CourseDocument, type TeachingCourse } from '../../api/materials';
// import { ApiError } from '../../api/client';
// import { Alert } from '../../components/common/Alert';
// import { calendarLabel } from '../../components/layout/calendar-label';
//
// export function FacultyHomePage() {
//   const [termId, setTermId] = useState<number | null>(null);
//   const [termLabel, setTermLabel] = useState('No active term');
//   const [courses, setCourses] = useState<TeachingCourse[]>([]);
//   const [courseId, setCourseId] = useState<number | null>(null);
//   const [documents, setDocuments] = useState<CourseDocument[]>([]);
//   const [title, setTitle] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [uploading, setUploading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [notice, setNotice] = useState<string | null>(null);
//
//   useEffect(() => {
//     let active = true;
//     currentCalendar()
//       .then((calendar) => {
//         if (!active) {
//           return;
//         }
//         setTermLabel(calendarLabel(calendar));
//         setTermId(calendar.academicTerm?.id ?? null);
//       })
//       .catch((caught: unknown) => {
//         if (active) {
//           setError(caught instanceof ApiError ? caught.message : 'Unable to load the calendar.');
//           setLoading(false);
//         }
//       });
//     return () => {
//       active = false;
//     };
//   }, []);
//
//   useEffect(() => {
//     if (!termId) {
//       setLoading(false);
//       return;
//     }
//     let active = true;
//     setLoading(true);
//     listTeachingCourses(termId)
//       .then((result) => {
//         if (!active) {
//           return;
//         }
//         setCourses(result.courses);
//         setCourseId((current) => current ?? result.courses[0]?.id ?? null);
//       })
//       .catch((caught: unknown) => {
//         if (active) {
//           setError(caught instanceof ApiError ? caught.message : 'Unable to load courses.');
//         }
//       })
//       .finally(() => {
//         if (active) {
//           setLoading(false);
//         }
//       });
//     return () => {
//       active = false;
//     };
//   }, [termId]);
//
//   useEffect(() => {
//     if (!termId || !courseId) {
//       setDocuments([]);
//       return;
//     }
//     let active = true;
//     listCourseDocuments(courseId, termId)
//       .then((result) => {
//         if (active) {
//           setDocuments(result.documents);
//         }
//       })
//       .catch((caught: unknown) => {
//         if (active) {
//           setError(caught instanceof ApiError ? caught.message : 'Unable to load documents.');
//         }
//       });
//     return () => {
//       active = false;
//     };
//   }, [courseId, termId]);
//
//   async function onUpload(event: FormEvent<HTMLFormElement>) {
//     event.preventDefault();
//     if (!termId || !courseId) {
//       return;
//     }
//     const form = new FormData(event.currentTarget);
//     const file = form.get('file');
//     if (!(file instanceof File) || file.size === 0) {
//       setError('Choose a PDF file.');
//       return;
//     }
//     setUploading(true);
//     setError(null);
//     setNotice(null);
//     try {
//       const document = await uploadCourseDocument(courseId, termId, title, file);
//       setDocuments((current) => [document, ...current.filter((item) => item.id !== document.id)]);
//       setTitle('');
//       event.currentTarget.reset();
//       setNotice(document.status === 'READY' ? 'The PDF is ready for questions.' : document.errorMessage || 'Processing failed.');
//     } catch (caught) {
//       setError(caught instanceof ApiError ? caught.message : 'Unable to upload the PDF.');
//     } finally {
//       setUploading(false);
//     }
//   }
//
//   return (
//     <section className="page">
//       <header className="page-header">
//         <div>
//           <p className="eyebrow">Teaching</p>
//           <h1>Course materials</h1>
//           <p className="muted">{termLabel}</p>
//         </div>
//       </header>
//       {error ? <Alert message={error} /> : null}
//       {notice ? <Alert message={notice} tone="success" /> : null}
//       {loading ? <p className="status">Loading courses...</p> : null}
//       {!loading && courses.length === 0 ? <p className="muted">No courses are assigned to you for this term.</p> : null}
//       {courses.length > 0 ? (
//         <>
//           <form className="card form-card" onSubmit={onUpload}>
//             <label className="field">
//               <span>Course</span>
//               <select name="courseId" value={courseId ?? ''} onChange={(event) => setCourseId(Number(event.target.value))}>
//                 {courses.map((course) => (
//                   <option key={course.id} value={course.id}>
//                     {course.code} · {course.name}
//                   </option>
//                 ))}
//               </select>
//             </label>
//             <label className="field">
//               <span>Title</span>
//               <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} />
//             </label>
//             <label className="field">
//               <span>PDF</span>
//               <input name="file" type="file" accept="application/pdf,.pdf" required />
//             </label>
//             <button className="button" type="submit" disabled={uploading || !title.trim()}>
//               {uploading ? 'Processing...' : 'Upload'}
//             </button>
//           </form>
//           <div className="table-wrap">
//             <table className="data-table">
//               <thead>
//                 <tr>
//                   <th>Title</th>
//                   <th>Status</th>
//                   <th>Pages</th>
//                   <th>Chunks</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {documents.length === 0 ? (
//                   <tr>
//                     <td colSpan={4}>No documents yet.</td>
//                   </tr>
//                 ) : (
//                   documents.map((document) => (
//                     <tr key={document.id}>
//                       <td>{document.title}</td>
//                       <td>{document.status === 'FAILED' ? document.errorMessage || 'FAILED' : document.status}</td>
//                       <td>{document.pageCount ?? '—'}</td>
//                       <td>{document.chunkCount}</td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </>
//       ) : null}
//     </section>
//   );
// }
